import { defineManifest } from '@crxjs/vite-plugin'

import packageJson from '../package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Episode Roulette',
  description: 'Play a random episode from a Netflix series.',
  version: packageJson.version,
  host_permissions: ['*://*.netflix.com/*'],
  content_scripts: [
    {
      matches: ['*://*.netflix.com/*'],
      js: ['src/content.ts'],
    },
  ],
})
