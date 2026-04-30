// Run once after deploying to register the feed on Bluesky:
//   npm run publish-feed
import { BskyAgent } from '@atproto/api'
import { config } from './config'

async function main() {
  const agent = new BskyAgent({ service: 'https://bsky.social' })
  await agent.login({
    identifier: config.bskyIdentifier,
    password: config.bskyAppPassword,
  })

  await agent.api.com.atproto.repo.putRecord({
    repo: agent.session!.did,
    collection: 'app.bsky.feed.generator',
    rkey: config.feedShortname,
    record: {
      $type: 'app.bsky.feed.generator',
      did: config.serviceDid,
      displayName: 'Latest Media',
      description: 'Recent posts with photos or videos from accounts you follow',
      createdAt: new Date().toISOString(),
    },
  })

  const feedUri = `at://${agent.session!.did}/app.bsky.feed.generator/${config.feedShortname}`
  console.log('Feed published!')
  console.log(`Feed URI: ${feedUri}`)
  console.log(
    `\nTo add it in Bluesky: Feeds → Search → paste the URI above, or navigate to:\nhttps://bsky.app/profile/${agent.session!.did}/feed/${config.feedShortname}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
