import WebSocket from 'ws'
import { Db } from './db'

type PostRecord = {
  $type?: string
  embed?: { $type?: string }
  reply?: unknown
}

type JetstreamCommit = {
  operation: string
  collection: string
  rkey: string
  cid: string
  record?: PostRecord
}

type JetstreamMessage = {
  did: string
  time_us: number
  kind: string
  commit?: JetstreamCommit
}

function hasMedia(record: PostRecord | undefined): boolean {
  if (!record?.embed?.$type) return false
  const t = record.embed.$type
  return (
    t === 'app.bsky.embed.images' ||
    t === 'app.bsky.embed.video' ||
    t === 'app.bsky.embed.recordWithMedia'
  )
}

const JETSTREAM_URL = 'wss://jetstream2.us-east.bsky.network/subscribe'
// Keep at most 30 days of posts; run cleanup once per hour
const MAX_AGE_DAYS = 30
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

export function startJetstreamSubscription(db: Db): void {
  const insertPost = db.prepare(
    'INSERT OR IGNORE INTO posts (uri, cid, author, indexed_at) VALUES (?, ?, ?, ?)',
  )
  const updateCursor = db.prepare('UPDATE cursor_state SET time_us = ? WHERE id = 1')
  const insertBatch = db.transaction(
    (rows: Array<[string, string, string, string]>) => {
      for (const r of rows) insertPost.run(...r)
    },
  )

  setInterval(() => {
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400 * 1000).toISOString()
    db.prepare('DELETE FROM posts WHERE indexed_at < ?').run(cutoff)
  }, CLEANUP_INTERVAL_MS)

  let reconnectDelay = 1000

  function connect() {
    const row = db
      .prepare('SELECT time_us FROM cursor_state WHERE id = 1')
      .get() as { time_us: number }
    const cursorParam = row.time_us > 0 ? `&cursor=${row.time_us}` : ''
    const url = `${JETSTREAM_URL}?wantedCollections=app.bsky.feed.post${cursorParam}`

    const ws = new WebSocket(url)
    let buffer: Array<[string, string, string, string]> = []
    let lastFlush = Date.now()
    let latestTimeUs = row.time_us

    function flush() {
      if (buffer.length === 0) return
      insertBatch(buffer)
      if (latestTimeUs > row.time_us) updateCursor.run(latestTimeUs)
      buffer = []
      lastFlush = Date.now()
    }

    ws.on('open', () => {
      console.log('[jetstream] connected')
      reconnectDelay = 1000
    })

    ws.on('message', (data: Buffer) => {
      let msg: JetstreamMessage
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }

      if (msg.kind !== 'commit') return
      const commit = msg.commit
      if (!commit || commit.operation !== 'create') return
      if (commit.collection !== 'app.bsky.feed.post') return
      if (!hasMedia(commit.record)) return

      const uri = `at://${msg.did}/app.bsky.feed.post/${commit.rkey}`
      const indexedAt = new Date(msg.time_us / 1000).toISOString()
      buffer.push([uri, commit.cid, msg.did, indexedAt])
      latestTimeUs = msg.time_us

      if (buffer.length >= 50 || Date.now() - lastFlush > 2000) flush()
    })

    ws.on('error', (err) => {
      console.error('[jetstream] error:', err.message)
    })

    ws.on('close', () => {
      flush()
      console.log(`[jetstream] disconnected — reconnecting in ${reconnectDelay}ms`)
      setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
    })
  }

  connect()
}
