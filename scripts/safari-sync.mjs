import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const sourceDirectory = path.join(projectRoot, 'dist', 'webextension')
const safariDirectory = path.join(projectRoot, 'safari')
const extensionDirectory = path.join(safariDirectory, 'Extension')
const destinationDirectory = path.join(extensionDirectory, 'Resources')
const packageJsonPath = path.join(projectRoot, 'package.json')
const generatedVersionPath = path.join(safariDirectory, 'GeneratedVersion.xcconfig')

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function listRegularFiles(root, relativeDirectory = '') {
  const directory = path.join(root, relativeDirectory)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listRegularFiles(root, relativePath)))
    } else if (entry.isFile()) {
      files.push(relativePath)
    } else {
      throw new Error(`Unsupported generated resource: ${relativePath}`)
    }
  }

  return files.sort()
}

async function verifyMirror(source, mirror) {
  const sourceFiles = await listRegularFiles(source)
  const mirrorFiles = await listRegularFiles(mirror)

  if (sourceFiles.join('\n') !== mirrorFiles.join('\n')) {
    throw new Error('Safari resource mirror does not contain the same files as the WebExtension build.')
  }

  for (const relativePath of sourceFiles) {
    const [sourceBytes, mirrorBytes] = await Promise.all([
      readFile(path.join(source, relativePath)),
      readFile(path.join(mirror, relativePath)),
    ])
    if (!sourceBytes.equals(mirrorBytes)) {
      throw new Error(`Safari resource differs from build output: ${relativePath}`)
    }
  }
}

await access(path.join(sourceDirectory, 'manifest.json'), constants.R_OK)
await access(path.join(safariDirectory, 'EpisodeRoulette.xcodeproj'), constants.R_OK)
await mkdir(extensionDirectory, { recursive: true })

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
const manifest = JSON.parse(await readFile(path.join(sourceDirectory, 'manifest.json'), 'utf8'))
if (manifest.version !== packageJson.version) {
  throw new Error('Generated manifest version does not match package.json.')
}

const buildNumber = process.env.EPISODE_ROULETTE_BUILD_NUMBER ?? '1'
if (!/^[1-9]\d*$/.test(buildNumber)) {
  throw new Error('EPISODE_ROULETTE_BUILD_NUMBER must be a positive integer.')
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'episode-roulette-safari-'))
const mirrorDirectory = path.join(temporaryRoot, 'Resources')
const backupDirectory = path.join(extensionDirectory, 'Resources.backup')
let destinationBackedUp = false
let destinationPromoted = false

try {
  await cp(sourceDirectory, mirrorDirectory, { recursive: true, preserveTimestamps: true })
  await verifyMirror(sourceDirectory, mirrorDirectory)
  await rm(backupDirectory, { recursive: true, force: true })

  if (await pathExists(destinationDirectory)) {
    await rename(destinationDirectory, backupDirectory)
    destinationBackedUp = true
  }

  try {
    await rename(mirrorDirectory, destinationDirectory)
    destinationPromoted = true
  } catch (error) {
    if (destinationBackedUp) {
      await rename(backupDirectory, destinationDirectory)
      destinationBackedUp = false
    }
    throw error
  }

  await verifyMirror(sourceDirectory, destinationDirectory)

  const versionConfiguration = [
    `MARKETING_VERSION = ${packageJson.version}`,
    `CURRENT_PROJECT_VERSION = ${buildNumber}`,
    '',
  ].join('\n')
  await writeFile(generatedVersionPath, versionConfiguration)
  await rm(backupDirectory, { recursive: true, force: true })
  destinationBackedUp = false
  destinationPromoted = false
} catch (error) {
  if (destinationPromoted) {
    await rm(destinationDirectory, { recursive: true, force: true })
    destinationPromoted = false
  }
  if (destinationBackedUp) {
    await rename(backupDirectory, destinationDirectory)
    destinationBackedUp = false
  }
  throw error
} finally {
  if (destinationBackedUp && !(await pathExists(destinationDirectory))) {
    await rename(backupDirectory, destinationDirectory)
  }
  await rm(temporaryRoot, { recursive: true, force: true })
}

const destinationStats = await stat(destinationDirectory)
if (!destinationStats.isDirectory()) {
  throw new Error('Safari resource destination is not a directory.')
}

const gitCheck = spawnSync(
  'git',
  ['ls-files', '--', 'safari/Extension/Resources'],
  { cwd: projectRoot, encoding: 'utf8' },
)
if (gitCheck.status !== 0) {
  throw new Error('Unable to verify generated Safari resource tracking state.')
}
if (gitCheck.stdout.trim() !== '') {
  throw new Error('Generated Safari resources must not be tracked by git.')
}
