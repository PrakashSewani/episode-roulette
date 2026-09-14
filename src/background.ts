import { logWarning } from './debug'

const INSTALL_URL = 'https://episode-roulette.prakashsewani.com/thanks'
const UNINSTALL_URL = 'https://episode-roulette.prakashsewani.com/uninstalled'

function registerUninstallUrl(): void {
  if (typeof chrome.runtime.setUninstallURL !== 'function') {
    return
  }

  try {
    chrome.runtime.setUninstallURL(UNINSTALL_URL)
  } catch (error) {
    logWarning('Could not register the uninstall survey URL', error)
  }
}

function openInstallPage(): void {
  try {
    void chrome.tabs.create({ url: INSTALL_URL }).catch((error: unknown) => {
      logWarning('Could not open the install onboarding page', error)
    })
  } catch (error) {
    logWarning('Could not open the install onboarding page', error)
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  registerUninstallUrl()

  if (details.reason !== 'install') {
    return
  }

  openInstallPage()
})

registerUninstallUrl()
