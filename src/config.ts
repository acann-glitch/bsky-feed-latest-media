import 'dotenv/config'

function required(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

const hostname = required('FEEDGEN_HOSTNAME')

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  hostname,
  serviceDid: process.env.FEEDGEN_SERVICE_DID || `did:web:${hostname}`,
  publisherDid: required('FEEDGEN_PUBLISHER_DID'),
  feedShortname: 'latest-media',
  bskyIdentifier: required('BSKY_IDENTIFIER'),
  bskyAppPassword: required('BSKY_APP_PASSWORD'),
}
