import { BskyAgent } from '@atproto/api'
import { Db } from './db'

type CacheEntry = { dids: string[]; expiresAt: number }
const followsCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes
const MAX_FOLLOWS = 5_000
const SQLITE_PARAM_LIMIT = 900       // stay safely under SQLite's 999-param limit

async function getFollows(agent: BskyAgent, did: string): Promise<string[]> {
  const cached = followsCache.get(did)
  if (cached && cached.expiresAt > Date.now()) return cached.dids

  const dids: string[] = []
  let cursor: string | undefined

  try {
    do {
      const res = await agent.api.app.bsky.graph.getFollows({
        actor: did,
        limit: 100,
        cursor,
      })
      dids.push(...res.data.follows.map((f: { did: string }) => f.did))
      cursor = res.data.cursor
    } while (cursor && dids.length < MAX_FOLLOWS)
  } catch (err) {
    // Return stale cache if available rather than failing the whole request
    const stale = followsCache.get(did)
    if (stale) return stale.dids
    throw err
  }

  followsCache.set(did, { dids, expiresAt: Date.now() + CACHE_TTL_MS })

  // Evict old entries to prevent unbounded memory growth
  if (followsCache.size > 10_000) {
    const now = Date.now()
    for (const [k, v] of followsCache) {
      if (v.expiresAt < now) followsCache.delete(k)
    }
  }

  return dids
}

export async function getFeedSkeleton(
  db: Db,
  agent: BskyAgent,
  requesterDid: string,
  cursor: string | undefined,
  limit: number,
): Promise<{ feed: { post: string }[]; cursor?: string }> {
  const follows = await getFollows(agent, requesterDid)
  if (follows.length === 0) return { feed: [] }

  const cutoff = cursor ?? new Date().toISOString()
  let rows: { uri: string; indexed_at: string }[] = []

  // Chunk the follows list to stay under SQLite's parameter limit
  for (let i = 0; i < follows.length; i += SQLITE_PARAM_LIMIT) {
    const chunk = follows.slice(i, i + SQLITE_PARAM_LIMIT)
    const placeholders = chunk.map(() => '?').join(',')
    const chunkRows = db
      .prepare(
        `SELECT uri, indexed_at FROM posts
         WHERE author IN (${placeholders}) AND indexed_at < ?
         ORDER BY indexed_at DESC
         LIMIT ?`,
      )
      .all(...chunk, cutoff, limit) as { uri: string; indexed_at: string }[]
    rows.push(...chunkRows)
  }

  rows.sort((a, b) => b.indexed_at.localeCompare(a.indexed_at))
  rows = rows.slice(0, limit)

  return {
    feed: rows.map((r) => ({ post: r.uri })),
    cursor: rows.length > 0 ? rows[rows.length - 1].indexed_at : undefined,
  }
}
