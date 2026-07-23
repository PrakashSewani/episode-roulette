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
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const safariDirectory = path.join(projectRoot, 'safari')
const webExtensionDirectory = path.join(projectRoot, 'dist', 'webextension')
const approvedEntries = new Set([
  'Base.xcconfig',
  'LocalSigning.xcconfig.example',
  'README.md',
  'SyncWebExtensionResources.sh',
])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    ...options,
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${command} failed${output ? `:\n${output}` : ''}`)
  }

  return result
}

function replaceExactlyOnce(content, pattern, replacement, description) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const matches = content.match(new RegExp(pattern.source, flags))
  if (matches?.length !== 1) {
    throw new Error(`Unexpected converter project structure while replacing ${description}.`)
  }
  return content.replace(pattern, replacement)
}

function removeMatchingLines(content, pattern) {
  return content
    .split('\n')
    .filter((line) => !pattern.test(line))
    .join('\n')
}

function normalizeProject(project) {
  const baseConfigurationId = 'E10000000000000000000001'
  const syncBuildPhaseId = 'E10000000000000000000002'
  const extensionTargetMatch = project.match(
    /([A-F0-9]{24}) \/\* EpisodeRoulette Extension \*\/ = \{\n\s+isa = PBXNativeTarget;[\s\S]*?\n\s+\};/,
  )
  if (!extensionTargetMatch) {
    throw new Error('Unable to locate the generated Safari extension target.')
  }
  const appTargetMatch = project.match(
    /([A-F0-9]{24}) \/\* EpisodeRoulette \*\/ = \{\n\s+isa = PBXNativeTarget;/,
  )
  if (!appTargetMatch) {
    throw new Error('Unable to locate the generated Safari app target.')
  }

  const resourcesGroupMatch = project.match(
    /\s+([A-F0-9]{24}) \/\* Resources \*\/ = \{\n\s+isa = PBXGroup;\n\s+children = \(\n[\s\S]*?name = Resources;\n\s+path = "EpisodeRoulette Extension";\n\s+sourceTree = SOURCE_ROOT;\n\s+\};\n/,
  )
  if (!resourcesGroupMatch) {
    throw new Error('Unable to locate generated per-file WebExtension resource references.')
  }

  const resourcesGroupId = resourcesGroupMatch[1]
  project = project.replace(resourcesGroupMatch[0], '\n')
  project = removeMatchingLines(
    project,
    /\/\* (manifest\.json|assets)( in Resources)? \*\/ /,
  )
  project = removeMatchingLines(project, new RegExp(`^\\s*${resourcesGroupId} \\/\\* Resources \\*\\/,?$`))

  project = replaceExactlyOnce(
    project,
    /\/\* Begin PBXFileReference section \*\//,
    `/* Begin PBXFileReference section */\n\t\t${baseConfigurationId} /* Base.xcconfig */ = {isa = PBXFileReference; lastKnownFileType = text.xcconfig; path = Base.xcconfig; sourceTree = "<group>"; };`,
    'Base.xcconfig file reference',
  )
  project = replaceExactlyOnce(
    project,
    /(isa = PBXGroup;\n\s+children = \(\n)(\s+[A-F0-9]{24} \/\* EpisodeRoulette \*\/)/,
    `$1\t\t\t\t${baseConfigurationId} /* Base.xcconfig */,\n$2`,
    'root configuration group entry',
  )
  project = replaceExactlyOnce(
    project,
    /\/\* Begin PBXResourcesBuildPhase section \*\//,
    `/* Begin PBXShellScriptBuildPhase section */\n\t\t${syncBuildPhaseId} /* Sync WebExtension Resources */ = {\n\t\t\tisa = PBXShellScriptBuildPhase;\n\t\t\talwaysOutOfDate = 1;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\tinputPaths = (\n\t\t\t\t"$(SRCROOT)/Extension/Resources",\n\t\t\t);\n\t\t\tname = "Sync WebExtension Resources";\n\t\t\toutputPaths = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t\tshellPath = /bin/sh;\n\t\t\tshellScript = "/bin/sh \\\"$SRCROOT/SyncWebExtensionResources.sh\\\"\\n";\n\t\t};\n/* End PBXShellScriptBuildPhase section */\n\n/* Begin PBXResourcesBuildPhase section */`,
    'resource synchronization build phase',
  )

  const extensionTarget = extensionTargetMatch[0]
  const normalizedExtensionTarget = replaceExactlyOnce(
    extensionTarget,
    /(buildPhases = \(\n[\s\S]*?\/\* Resources \*\/,\n)/,
    `$1\t\t\t\t${syncBuildPhaseId} /* Sync WebExtension Resources */,\n`,
    'extension build phase attachment',
  )
  project = project.replace(extensionTarget, normalizedExtensionTarget)

  project = project.replace(/path = EpisodeRoulette;/g, 'path = App;')
  project = project.replace(/path = "EpisodeRoulette Extension";/g, 'path = Extension;')
  project = project.replace(/INFOPLIST_FILE = EpisodeRoulette\/Info\.plist;/g, 'INFOPLIST_FILE = App/Info.plist;')
  project = project.replace(
    /INFOPLIST_FILE = "EpisodeRoulette Extension\/Info\.plist";/g,
    'INFOPLIST_FILE = Extension/Info.plist;',
  )
  project = project.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = com\.episoderoulette\.EpisodeRoulette\.Extension;/g,
    'PRODUCT_BUNDLE_IDENTIFIER = "$(EPISODE_ROULETTE_EXTENSION_BUNDLE_IDENTIFIER)";',
  )
  project = project.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = com\.episoderoulette\.EpisodeRoulette;/g,
    'PRODUCT_BUNDLE_IDENTIFIER = "$(EPISODE_ROULETTE_APP_BUNDLE_IDENTIFIER)";',
  )
  project = removeMatchingLines(
    project,
    /^\s+(CURRENT_PROJECT_VERSION|MARKETING_VERSION|ENABLE_USER_SCRIPT_SANDBOXING) = /,
  )
  project = project.replace(
    /isa = XCBuildConfiguration;\n/g,
    `isa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = ${baseConfigurationId} /* Base.xcconfig */;\n`,
  )

  if ((project.match(/baseConfigurationReference =/g) ?? []).length !== 6) {
    throw new Error('Every generated build configuration must use Base.xcconfig.')
  }
  if (project.includes('Resources/manifest.json') || project.includes('Resources/assets')) {
    throw new Error('Generated resource file references remain in the normalized project.')
  }

  return {
    appTargetId: appTargetMatch[1],
    project,
  }
}

const xcode = run('xcodebuild', ['-version'])
if (!xcode.stdout.includes('Xcode 26.6') || !xcode.stdout.includes('17F113')) {
  throw new Error('Safari wrapper bootstrap is verified only for Xcode 26.6 build 17F113.')
}
run('xcrun', ['--find', 'safari-web-extension-converter'])
await access(path.join(webExtensionDirectory, 'manifest.json'), constants.R_OK)

const entries = await readdir(safariDirectory)
const unexpectedEntries = entries.filter((entry) => !approvedEntries.has(entry))
if (unexpectedEntries.length > 0) {
  throw new Error(
    `Refusing to initialize Safari wrapper because safari/ is not pristine: ${unexpectedEntries.join(', ')}`,
  )
}

const temporaryRoot = await mkdtemp(path.join(projectRoot, '.safari-init-'))
const converterOutput = path.join(temporaryRoot, 'converter')
const stagedSafari = path.join(temporaryRoot, 'safari')
const backupSafari = path.join(projectRoot, '.safari-init-backup')
let priorSafariBackedUp = false
let stagedSafariPromoted = false

try {
  await mkdir(converterOutput)
  run('xcrun', [
    'safari-web-extension-converter',
    webExtensionDirectory,
    '--project-location',
    converterOutput,
    '--app-name',
    'EpisodeRoulette',
    '--bundle-identifier',
    'com.episoderoulette.EpisodeRoulette',
    '--swift',
    '--macos-only',
    '--copy-resources',
    '--no-open',
    '--no-prompt',
  ])

  const generatedRoot = path.join(converterOutput, 'EpisodeRoulette')
  await access(path.join(generatedRoot, 'EpisodeRoulette.xcodeproj', 'project.pbxproj'))
  await access(path.join(generatedRoot, 'EpisodeRoulette', 'Info.plist'))
  await access(path.join(generatedRoot, 'EpisodeRoulette Extension', 'Info.plist'))

  await mkdir(stagedSafari)
  for (const entry of approvedEntries) {
    await cp(path.join(safariDirectory, entry), path.join(stagedSafari, entry), { recursive: true })
  }
  await cp(path.join(generatedRoot, 'EpisodeRoulette.xcodeproj'), path.join(stagedSafari, 'EpisodeRoulette.xcodeproj'), { recursive: true })
  await cp(path.join(generatedRoot, 'EpisodeRoulette'), path.join(stagedSafari, 'App'), { recursive: true })
  await cp(path.join(generatedRoot, 'EpisodeRoulette Extension'), path.join(stagedSafari, 'Extension'), { recursive: true })
  await rm(path.join(stagedSafari, 'Extension', 'Resources'), { recursive: true, force: true })

  const projectPath = path.join(stagedSafari, 'EpisodeRoulette.xcodeproj', 'project.pbxproj')
  const normalizedProject = normalizeProject(await readFile(projectPath, 'utf8'))
  await writeFile(projectPath, normalizedProject.project)

  const appInfoPath = path.join(stagedSafari, 'App', 'Info.plist')
  let appInfo = await readFile(appInfoPath, 'utf8')
  appInfo = replaceExactlyOnce(
    appInfo,
    /<dict>\n/,
    '<dict>\n\t<key>EpisodeRouletteExtensionBundleIdentifier</key>\n\t<string>$(EPISODE_ROULETTE_EXTENSION_BUNDLE_IDENTIFIER)</string>\n',
    'app extension bundle identifier plist key',
  )
  await writeFile(appInfoPath, appInfo)

  const viewControllerPath = path.join(stagedSafari, 'App', 'ViewController.swift')
  let viewController = await readFile(viewControllerPath, 'utf8')
  viewController = replaceExactlyOnce(
    viewController,
    /let extensionBundleIdentifier = "com\.episoderoulette\.EpisodeRoulette\.Extension"/,
    'let extensionBundleIdentifier = Bundle.main.object(forInfoDictionaryKey: "EpisodeRouletteExtensionBundleIdentifier") as! String',
    'app extension bundle identifier lookup',
  )
  await writeFile(viewControllerPath, viewController)

  const schemeDirectory = path.join(stagedSafari, 'EpisodeRoulette.xcodeproj', 'xcshareddata', 'xcschemes')
  await mkdir(schemeDirectory, { recursive: true })
  await writeFile(
    path.join(schemeDirectory, 'EpisodeRoulette.xcscheme'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<Scheme LastUpgradeVersion="2660" version="1.7">\n   <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">\n      <BuildActionEntries>\n         <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">\n            <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${normalizedProject.appTargetId}" BuildableName="EpisodeRoulette.app" BlueprintName="EpisodeRoulette" ReferencedContainer="container:EpisodeRoulette.xcodeproj"/>\n         </BuildActionEntry>\n      </BuildActionEntries>\n   </BuildAction>\n   <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES">\n      <BuildableProductRunnable runnableDebuggingMode="0">\n         <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${normalizedProject.appTargetId}" BuildableName="EpisodeRoulette.app" BlueprintName="EpisodeRoulette" ReferencedContainer="container:EpisodeRoulette.xcodeproj"/>\n      </BuildableProductRunnable>\n   </LaunchAction>\n   <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES">\n      <BuildableProductRunnable runnableDebuggingMode="0">\n         <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${normalizedProject.appTargetId}" BuildableName="EpisodeRoulette.app" BlueprintName="EpisodeRoulette" ReferencedContainer="container:EpisodeRoulette.xcodeproj"/>\n      </BuildableProductRunnable>\n   </ProfileAction>\n   <AnalyzeAction buildConfiguration="Debug"/>\n   <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>\n</Scheme>\n`,
  )

  await rm(backupSafari, { recursive: true, force: true })
  await rename(safariDirectory, backupSafari)
  priorSafariBackedUp = true
  await rename(stagedSafari, safariDirectory)
  stagedSafariPromoted = true
  await rm(backupSafari, { recursive: true, force: true })
  priorSafariBackedUp = false
} catch (error) {
  if (stagedSafariPromoted) {
    await rm(safariDirectory, { recursive: true, force: true })
  }
  if (priorSafariBackedUp) {
    await rename(backupSafari, safariDirectory)
  }
  throw error
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
