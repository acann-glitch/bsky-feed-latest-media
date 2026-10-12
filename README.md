# Bluesky Feed: Latest Media

A Bluesky custom feed generator. The **Latest Media** feed shows recent posts with photos or videos from accounts you follow.

## How it works

- Listens to the Bluesky firehose through Jetstream and stores posts that contain media in a local SQLite database.
- When someone opens the feed, it looks up who they follow (cached for 5 minutes, up to 5,000 accounts) and returns the newest media posts from those accounts.
- Serves the standard feed generator endpoints:
  - `/.well-known/did.json`
  - `/xrpc/app.bsky.feed.describeFeedGenerator`
  - `/xrpc/app.bsky.feed.getFeedSkeleton`
  - `/healthz`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill it in:
   - `FEEDGEN_HOSTNAME`: the public hostname of your deployment (e.g. `my-feed.up.railway.app`)
   - `FEEDGEN_PUBLISHER_DID`: your Bluesky DID
   - `BSKY_IDENTIFIER` and `BSKY_APP_PASSWORD`: your handle and an App Password
   - `PORT` and `FEEDGEN_SERVICE_DID` can usually be left as they are
3. Run it:
   ```bash
   npm run dev      # development (ts-node)
   npm run build    # compile to dist/
   npm start        # run the compiled build
   ```
4. Publish the feed to your Bluesky account (once, after it's deployed):
   ```bash
   npm run publish-feed
   ```

## Deployment

Set up for [Railway](https://railway.app), which sets `PORT` automatically. Any Node host with a public HTTPS hostname works.

## Source

| File | Purpose |
| --- | --- |
| `src/index.ts` | Entry point |
| `src/jetstream.ts` | Firehose listener |
| `src/db.ts` | SQLite storage |
| `src/feed.ts` | Builds the feed for a user |
| `src/server.ts` | HTTP endpoints |
| `src/auth.ts` | Request authentication |
| `src/config.ts` | Settings from `.env` |
| `src/publishFeed.ts` | Registers the feed on your account |
