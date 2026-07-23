import { spawnSync } from 'node:child_process'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const result = spawnSync(
  'xcodebuild',
  [
    '-project',
    'safari/EpisodeRoulette.xcodeproj',
    '-scheme',
    'EpisodeRoulette',
    '-configuration',
    'Debug',
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ],
  { cwd: projectRoot, stdio: 'inherit' },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
