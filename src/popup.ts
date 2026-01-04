import { clearAll } from './utils/statsCache'

// Storage key for extension state
const STORAGE_KEY_ENABLED = 'extensionEnabled'

// URLs
const CHROME_STORE_URL = 'https://chromewebstore.google.com' // TODO: Update with actual extension URL
const GITHUB_ISSUES_URL = 'https://github.com/11me/PinStats/issues'

// DOM elements
const toggle = document.getElementById('extensionToggle') as HTMLInputElement
const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement
const supportBtn = document.getElementById('supportBtn') as HTMLButtonElement
const rateBtn = document.getElementById('rateBtn') as HTMLButtonElement
const reportBtn = document.getElementById('reportBtn') as HTMLButtonElement
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement

/**
 * Show status message with auto-dismiss
 */
function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  statusMessage.textContent = message
  statusMessage.className = `status ${type}`

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    statusMessage.className = 'status hidden'
  }, 3000)
}

/**
 * Load extension state from storage
 */
async function loadState(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY_ENABLED)
    return result[STORAGE_KEY_ENABLED] !== false // Default to true
  } catch (error) {
    console.error('[PinStats] Failed to load state:', error)
    return true // Fail-open
  }
}

/**
 * Save extension state to storage
 */
async function saveState(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY_ENABLED]: enabled })
    console.log(`[PinStats] Extension ${enabled ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('[PinStats] Failed to save state:', error)
    throw error
  }
}

/**
 * Notify all tabs about state change
 */
async function notifyTabsStateChange(enabled: boolean): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({})
    const promises = tabs.map(tab => {
      if (tab.id) {
        return chrome.tabs.sendMessage(tab.id, {
          type: 'state-change',
          enabled,
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script
        })
      }
    })
    await Promise.all(promises)
  } catch (error) {
    console.error('[PinStats] Failed to notify tabs:', error)
  }
}

/**
 * Handle toggle change
 */
async function handleToggleChange(): Promise<void> {
  const enabled = toggle.checked

  try {
    await saveState(enabled)
    await notifyTabsStateChange(enabled)
    showStatus(
      enabled ? 'Extension enabled' : 'Extension disabled',
      'success'
    )
  } catch (error) {
    showStatus('Failed to update state', 'error')
    // Revert toggle
    toggle.checked = !enabled
  }
}

/**
 * Handle clear cache button
 */
async function handleClearCache(): Promise<void> {
  try {
    await clearAll()
    showStatus('Cache cleared successfully', 'success')
  } catch (error) {
    console.error('[PinStats] Failed to clear cache:', error)
    showStatus('Failed to clear cache', 'error')
  }
}

/**
 * Handle support button
 */
function handleSupport(): void {
  chrome.tabs.create({
    url: chrome.runtime.getURL('support.html'),
  })
}

/**
 * Handle rate us button
 */
function handleRate(): void {
  chrome.tabs.create({
    url: CHROME_STORE_URL,
  })
}

/**
 * Handle report bug button
 */
function handleReport(): void {
  chrome.tabs.create({
    url: GITHUB_ISSUES_URL,
  })
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  // Load current state
  const enabled = await loadState()
  toggle.checked = enabled

  // Add event listeners
  toggle.addEventListener('change', handleToggleChange)
  clearCacheBtn.addEventListener('click', handleClearCache)
  supportBtn.addEventListener('click', handleSupport)
  rateBtn.addEventListener('click', handleRate)
  reportBtn.addEventListener('click', handleReport)
}

// Initialize when DOM is ready
init()
