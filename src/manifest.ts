import { defineManifest } from '@crxjs/vite-plugin'

import packageJson from '../package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Episode Roulette',
  description: 'Play a random episode from any season of a Netflix or Prime Video series.',
  version: packageJson.version,
  host_permissions: ['*://*.netflix.com/*', '*://www.primevideo.com/*'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['*://*.netflix.com/*', '*://www.primevideo.com/*'],
      js: ['src/content.ts'],
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Episode Roulette',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
})
