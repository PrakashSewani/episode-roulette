import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const buildRoot = path.join(projectRoot, 'dist', 'webextension')
const safariRoot = path.join(projectRoot, 'safari')
const safariResources = path.join(safariRoot, 'Extension', 'Resources')
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
const netflixPattern = '*://*.netflix.com/*'
const forbiddenPermissions = new Set([
  'cookies',
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'history',
  'nativeMessaging',
  'webRequest',
  'webRequestBlocking',
])

function fail(message) {
  throw new Error(message)
}

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function listFiles(root, relativeDirectory = '') {
  const directory = path.join(root, relativeDirectory)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath))
    } else if (entry.isFile()) {
      files.push(relativePath)
    } else {
      fail(`Unsupported package entry: ${path.relative(projectRoot, path.join(root, relativePath))}`)
    }
  }

  return files.sort()
}

function safeRelativePath(value, label) {
  if (typeof value !== 'string' || value === '' || path.isAbsolute(value)) {
    fail(`${label} must be a non-empty relative path.`)
  }
  const normalized = path.normalize(value)
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    fail(`${label} escapes the package: ${value}`)
  }
  return normalized
}

async function assertDeclaredFile(root, value, label) {
  const relativePath = safeRelativePath(value, label)
  const targetPath = path.join(root, relativePath)
  if (!(await exists(targetPath))) fail(`${label} is missing: ${value}`)
}

function assertNetflixPatterns(patterns, label) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    fail(`${label} must contain the Netflix match pattern.`)
  }
  if (patterns.some((pattern) => pattern !== netflixPattern)) {
    fail(`${label} contains access outside Netflix.`)
  }
}

function containsKey(value, key) {
  if (Array.isArray(value)) return value.some((entry) => containsKey(entry, key))
  if (value === null || typeof value !== 'object') return false
  return Object.entries(value).some(([entryKey, entryValue]) => (
    entryKey === key || containsKey(entryValue, key)
  ))
}

async function assertManifest(root) {
  const manifestPath = path.join(root, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.manifest_version !== 3) fail('Manifest must use version 3.')
  if (manifest.version !== packageJson.version) fail('Manifest version must match package.json.')
  if (Object.hasOwn(manifest, 'background') || containsKey(manifest, 'service_worker')) {
    fail('Manifest must not declare a background runtime or service worker.')
  }
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify([netflixPattern])) {
    fail('Host permissions must contain only Netflix.')
  }
  if ((manifest.optional_host_permissions?.length ?? 0) !== 0) {
    fail('Optional host permissions are not allowed.')
  }
  for (const permission of manifest.permissions ?? []) {
    if (forbiddenPermissions.has(permission)) fail(`Forbidden permission: ${permission}`)
  }
  if ((manifest.permissions?.length ?? 0) !== 0) {
    fail('The first release must not request extension permissions.')
  }
  if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
    fail('Manifest must declare a Netflix content script.')
  }
  for (const script of manifest.content_scripts) {
    assertNetflixPatterns(script.matches, 'Content-script matches')
    if (!Array.isArray(script.js) || script.js.length === 0) {
      fail('Every content script must declare JavaScript.')
    }
    for (const resource of script.js) {
      await assertDeclaredFile(root, resource, 'Content-script resource')
    }
  }
  for (const group of manifest.web_accessible_resources ?? []) {
    assertNetflixPatterns(group.matches, 'Web-accessible resource matches')
    for (const resource of group.resources ?? []) {
      if (resource.includes('*')) fail(`Wildcard resource cannot be asserted: ${resource}`)
      await assertDeclaredFile(root, resource, 'Web-accessible resource')
    }
  }
  if (await exists(path.join(root, 'webextension', 'manifest.json'))) {
    fail('WebExtension package must not contain a nested webextension directory.')
  }
  return { manifest, bytes: await readFile(manifestPath) }
}

async function assertMirror(source, mirror) {
  const [sourceFiles, mirrorFiles] = await Promise.all([listFiles(source), listFiles(mirror)])
  if (sourceFiles.join('\n') !== mirrorFiles.join('\n')) {
    fail('Safari resources do not exactly mirror the WebExtension build.')
  }
  for (const relativePath of sourceFiles) {
    const [sourceBytes, mirrorBytes] = await Promise.all([
      readFile(path.join(source, relativePath)),
      readFile(path.join(mirror, relativePath)),
    ])
    if (!sourceBytes.equals(mirrorBytes)) fail(`Safari mirror differs: ${relativePath}`)
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function parseBuildSettings(output) {
  const settings = new Map()
  for (const line of output.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z0-9_]+) = (.*)$/u)
    if (match) settings.set(match[1], match[2])
  }
  return settings
}

function targetSettings(target) {
  return parseBuildSettings(run('xcodebuild', [
    '-project', 'safari/EpisodeRoulette.xcodeproj',
    '-target', target,
    '-configuration', 'Debug',
    'CODE_SIGNING_ALLOWED=NO',
    '-showBuildSettings',
  ]))
}

function schemeSettings() {
  return parseBuildSettings(run('xcodebuild', [
    '-project', 'safari/EpisodeRoulette.xcodeproj',
    '-scheme', 'EpisodeRoulette',
    '-configuration', 'Debug',
    'CODE_SIGNING_ALLOWED=NO',
    '-showBuildSettings',
  ]))
}

function assertIgnored(targetPath) {
  run('git', ['check-ignore', '-q', targetPath])
}

async function assertNoDuplicatedProductSource() {
  const files = await listFiles(safariRoot)
  for (const relativePath of files) {
    if (relativePath.startsWith(`Extension${path.sep}Resources${path.sep}`)) continue
    if (/\.(?:cts|mts|ts|tsx)$/u.test(relativePath)) {
      fail(`Safari wrapper contains duplicated TypeScript product source: ${relativePath}`)
    }
    if (path.basename(relativePath) === 'manifest.json') {
      fail(`Safari wrapper contains a non-generated manifest: ${relativePath}`)
    }
    if (relativePath.endsWith('.js') && relativePath !== path.join('App', 'Resources', 'Script.js')) {
      fail(`Safari wrapper contains unexpected non-generated JavaScript: ${relativePath}`)
    }
  }
}

async function assertWebExtension() {
  await access(path.join(buildRoot, 'manifest.json'), constants.R_OK)
  await assertManifest(buildRoot)
  console.log('WebExtension package assertions passed.')
}

async function assertSafari() {
  const { manifest, bytes: buildManifest } = await assertManifest(buildRoot)
  await access(path.join(safariResources, 'manifest.json'), constants.R_OK)
  await assertManifest(safariResources)
  await assertMirror(buildRoot, safariResources)
  const safariManifest = await readFile(path.join(safariResources, 'manifest.json'))
  if (!buildManifest.equals(safariManifest)) fail('Chrome and Safari manifests differ.')
  if (await exists(path.join(safariResources, 'webextension', 'manifest.json'))) {
    fail('Safari resources contain a nested webextension package.')
  }

  assertIgnored('safari/Extension/Resources/manifest.json')
  assertIgnored('safari/GeneratedVersion.xcconfig')
  assertIgnored('safari/LocalSigning.xcconfig')
  const tracked = run('git', ['ls-files', '--',
    'safari/Extension/Resources',
    'safari/GeneratedVersion.xcconfig',
    'safari/LocalSigning.xcconfig',
  ])
  if (tracked.trim() !== '') fail('Generated Safari output or local signing configuration is tracked.')

  const buildNumber = process.env.EPISODE_ROULETTE_BUILD_NUMBER ?? '1'
  if (!/^[1-9]\d*$/u.test(buildNumber)) fail('Build number must be a positive integer.')
  const generatedVersion = await readFile(
    path.join(safariRoot, 'GeneratedVersion.xcconfig'),
    'utf8',
  )
  const expectedVersion = [
    `MARKETING_VERSION = ${packageJson.version}`,
    `CURRENT_PROJECT_VERSION = ${buildNumber}`,
    '',
  ].join('\n')
  if (generatedVersion !== expectedVersion) fail('Generated Safari version settings are incorrect.')

  for (const target of ['EpisodeRoulette', 'EpisodeRoulette Extension']) {
    const settings = targetSettings(target)
    if (settings.get('MARKETING_VERSION') !== packageJson.version) {
      fail(`${target} MARKETING_VERSION does not match package.json.`)
    }
    if (settings.get('CURRENT_PROJECT_VERSION') !== buildNumber) {
      fail(`${target} CURRENT_PROJECT_VERSION does not match the build number.`)
    }
  }

  const extensionSettings = targetSettings('EpisodeRoulette Extension')
  const builtProductsDirectory = schemeSettings().get('BUILT_PRODUCTS_DIR')
  const fullProductName = extensionSettings.get('FULL_PRODUCT_NAME')
  const resourcesFolder = extensionSettings.get('UNLOCALIZED_RESOURCES_FOLDER_PATH')
  if (!builtProductsDirectory || !fullProductName || !resourcesFolder) {
    fail('Unable to resolve the built Safari extension resource path.')
  }
  const relativeResourcesFolder = path.relative(fullProductName, resourcesFolder)
  const builtResourceRoot = path.join(
    builtProductsDirectory,
    fullProductName,
    relativeResourcesFolder,
  )
  const builtManifestPath = path.join(builtResourceRoot, 'manifest.json')
  await access(builtManifestPath, constants.R_OK)
  if (await exists(path.join(builtResourceRoot, 'Resources', 'manifest.json'))) {
    fail('Built Safari extension contains a nested Resources/manifest.json.')
  }
  const builtManifest = await readFile(builtManifestPath)
  if (!builtManifest.equals(buildManifest)) fail('Built Safari manifest differs from WebExtension output.')
  for (const script of manifest.content_scripts) {
    for (const resource of script.js) await assertDeclaredFile(builtResourceRoot, resource, 'Built content script')
  }
  for (const group of manifest.web_accessible_resources ?? []) {
    for (const resource of group.resources ?? []) {
      if (!resource.includes('*')) await assertDeclaredFile(builtResourceRoot, resource, 'Built resource')
    }
  }
  for (const relativePath of await listFiles(buildRoot)) {
    const [sourceBytes, builtBytes] = await Promise.all([
      readFile(path.join(buildRoot, relativePath)),
      readFile(path.join(builtResourceRoot, relativePath)),
    ])
    if (!sourceBytes.equals(builtBytes)) fail(`Built Safari resource differs: ${relativePath}`)
  }

  await assertNoDuplicatedProductSource()
  console.log('Safari package assertions passed.')
}

const mode = process.argv[2]
if (mode === 'webextension') await assertWebExtension()
else if (mode === 'safari') await assertSafari()
else fail('Usage: node scripts/assert-packaging.mjs <webextension|safari>')
