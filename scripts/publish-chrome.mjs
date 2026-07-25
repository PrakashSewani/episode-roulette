import { createWriteStream, readFileSync, readdir, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createGzip } from 'node:zlib'
import { execSync } from 'node:child_process'

const projectRoot = join(import.meta.dirname, '..')
const buildRoot = join(projectRoot, 'dist', 'webextension')
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))

const extensionId = process.env.CHROME_EXTENSION_ID
const clientId = process.env.CHROME_CLIENT_ID
const clientSecret = process.env.CHROME_CLIENT_SECRET
const refreshToken = process.env.CHROME_REFRESH_TOKEN

const required = { CHROME_EXTENSION_ID: extensionId, CHROME_CLIENT_ID: clientId, CHROME_CLIENT_SECRET: clientSecret, CHROME_REFRESH_TOKEN: refreshToken }
for (const [name, value] of Object.entries(required)) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    console.error('See docs/release.md for setup instructions.')
    process.exit(1)
  }
}

function zipDirectory(sourceDir, outFile) {
  execSync(`cd "${sourceDir}" && zip -r -q "${outFile}" . -x ".*"`, { stdio: 'inherit' })
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`)
  }
  const data = await response.json()
  return data.access_token
}

async function uploadPackage(token, zipPath) {
  const zipBuffer = readFileSync(zipPath)
  const response = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/zip',
      'Content-Length': String(zipBuffer.length),
    },
    body: zipBuffer,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${await response.text()}`)
  }
  const data = await response.json()
  console.log('Upload response:', data)
  return data
}

async function publishPackage(token) {
  const response = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target: 'trusted' }),
  })
  if (!response.ok) {
    throw new Error(`Publish failed: ${response.status} ${await response.text()}`)
  }
  const data = await response.json()
  console.log('Publish response:', data)
  return data
}

console.log(`Publishing Episode Roulette v${packageJson.version} to Chrome Web Store (${extensionId})...`)

const zipPath = join(projectRoot, 'dist', 'episode-roulette-v' + packageJson.version + '.zip')
zipDirectory(buildRoot, zipPath)
console.log(`Created ${zipPath}`)

const token = await getAccessToken()
console.log('Obtained access token')

await uploadPackage(token, zipPath)
console.log('Package uploaded')

await publishPackage(token)
console.log('Package published to Chrome Web Store')
