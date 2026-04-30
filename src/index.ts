import { BskyAgent } from '@atproto/api'
import { createDb } from './db'
import { createServer } from './server'
import { startJetstreamSubscription } from './jetstream'
import { config } from './config'

async function main() {
  const db = createDb()

  const agent = new BskyAgent({ service: 'https://bsky.social' })
  await agent.login({
    identifier: config.bskyIdentifier,
    password: config.bskyAppPassword,
  })
  console.log(`[auth] logged in as ${config.bskyIdentifier}`)

  startJetstreamSubscription(db)

  const server = createServer(db, agent)
  server.listen(config.port, () => {
    console.log(`[server] listening on port ${config.port}`)
    console.log(
      `[server] feed URI: at://${config.publisherDid}/app.bsky.feed.generator/${config.feedShortname}`,
    )
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
