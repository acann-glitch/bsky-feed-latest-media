import express from 'express'
import { BskyAgent } from '@atproto/api'
import { Db } from './db'
import { config } from './config'
import { getRequesterDid } from './auth'
import { getFeedSkeleton } from './feed'

export function createServer(db: Db, agent: BskyAgent) {
  const app = express()

  app.get('/.well-known/did.json', (_req, res) => {
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: config.serviceDid,
      service: [
        {
          id: '#atproto_feed_generator',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${config.hostname}`,
        },
      ],
    })
  })

  app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (_req, res) => {
    res.json({
      did: config.serviceDid,
      feeds: [
        {
          uri: `at://${config.publisherDid}/app.bsky.feed.generator/${config.feedShortname}`,
        },
      ],
    })
  })

  app.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (req, res) => {
    const feedUri = req.query.feed as string
    const expectedUri = `at://${config.publisherDid}/app.bsky.feed.generator/${config.feedShortname}`

    if (feedUri !== expectedUri) {
      return res.status(400).json({ error: 'UnsupportedAlgorithm' })
    }

    const requesterDid = getRequesterDid(req)
    if (!requesterDid) {
      return res.status(401).json({ error: 'AuthRequired' })
    }

    const cursor = req.query.cursor as string | undefined
    const limit = Math.min(parseInt((req.query.limit as string) || '30', 10), 100)

    try {
      const result = await getFeedSkeleton(db, agent, requesterDid, cursor, limit)
      return res.json(result)
    } catch (err) {
      console.error('[server] getFeedSkeleton error:', err)
      return res.status(500).json({ error: 'InternalServerError' })
    }
  })

  // Health check for Railway
  app.get('/healthz', (_req, res) => res.send('ok'))

  return app
}
