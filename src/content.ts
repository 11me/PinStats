/**
 * Content script - runs in ISOLATED world
 * Uses link-based pin detection (more reliable than data attributes)
 * Cache-first pattern with periodic scanning
 */

// IMMEDIATE LOG - should appear as soon as content script loads
console.log('%c[PinStats] CONTENT SCRIPT LOADED', 'color: green; font-weight: bold; font-size: 14px;')

import './styles.css'
import type { PostMessagePayload, DownloadRequest, DownloadResponse, FetchStatsRequest, InjectorMessage } from './types/messages'
import type { PinData } from './types/pinterest'
import * as cache from './utils/statsCache'
import { SOURCE_ID, CONTENT_SOURCE_ID } from './constants'

// Track processed containers to avoid duplicates
const processedContainers = new WeakSet<Element>()

// Pins we've requested from API
const pendingRequests = new Set<string>()

// Batch fetch queue
let fetchQueue: string[] = []
let fetchTimer: ReturnType<typeof setTimeout> | null = null
const FETCH_DELAY_MS = 300
const MAX_BATCH_SIZE = 20 // Match injector's CONCURRENT_LIMIT for optimal parallel fetching

// Injector ready state
let injectorReady = false
const pendingFetchRequests: string[] = []

// Cleanup references
let scanIntervalId: number | null = null
let refreshIntervalId: number | null = null
let syncIntervalId: number | null = null
let mutationObserver: MutationObserver | null = null

/**
 * Inject the injector script into MAIN world
 */
function injectScript(): void {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('injector.js')
  script.onload = function () {
    console.log('[PinStats] Injector loaded into MAIN world')
    ;(this as HTMLScriptElement).remove()
  }
  script.onerror = function (e) {
    console.error('[PinStats] Failed to load injector:', e)
  }
  ;(document.head || document.documentElement).appendChild(script)
}

/**
 * Format number for display
 */
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/**
 * Update overlay with cached data
 */
function updateOverlay(pinID: string): void {
  const overlays = document.querySelectorAll(`.pinstats-overlay[data-pin-id="${pinID}"]`)
  const data = cache.get(pinID)
  if (!data) return

  overlays.forEach((overlay) => {
    // Remove loading state
    overlay.classList.remove('pinstats-loading')
    overlay.querySelectorAll('.pinstats-loader').forEach((loader) => loader.remove())

    const savesEl = overlay.querySelector('.stat-saves .stat-value')
    if (savesEl) savesEl.textContent = formatNumber(data.engagement.repins)

    const commentsEl = overlay.querySelector('.stat-comments .stat-value')
    if (commentsEl) commentsEl.textContent = formatNumber(data.engagement.comments)

    const sharesEl = overlay.querySelector('.stat-shares .stat-value')
    if (sharesEl) sharesEl.textContent = formatNumber(data.engagement.shares)

    const reactionsEl = overlay.querySelector('.stat-reactions .stat-value')
    if (reactionsEl) reactionsEl.textContent = formatNumber(data.engagement.reactions)

    const ageEl = overlay.querySelector('.stat-age .stat-value')
    if (ageEl) ageEl.textContent = data.details.createdAgo || '—'
  })
}

/**
 * Listen for messages from injector
 */
function setupMessageListener(): void {
  console.log('%c[PinStats] Setting up message listener...', 'color: blue; font-weight: bold;')

  window.addEventListener('message', (event) => {
    // Log ALL messages to see what's coming through
    const data = event.data
    if (data && typeof data === 'object' && data.source && String(data.source).includes('pinstats')) {
      console.log('%c[PinStats] RAW MESSAGE RECEIVED:', 'color: purple; font-weight: bold;', JSON.stringify(data).substring(0, 200))
    }

    if (event.source !== window) return
    if (event.origin !== window.origin) return

    const message = event.data as InjectorMessage
    if (message?.source !== SOURCE_ID) return

    // Debug: Log all messages from injector
    console.log(`%c[PinStats] Content received message type: ${message.type}`, 'color: green;')

    // Handle injector ready signal
    if (message.type === 'injector-ready') {
      console.log('[PinStats] Injector is ready!')
      injectorReady = true

      // Process any pending fetch requests
      if (pendingFetchRequests.length > 0) {
        console.log(`[PinStats] Processing ${pendingFetchRequests.length} pending fetch requests`)
        const pinsToFetch = [...pendingFetchRequests]
        pendingFetchRequests.length = 0
        pinsToFetch.forEach((pinID) => requestStatsFetch(pinID))
      }
      return
    }

    // Handle pin stats
    if (message.type !== 'pin-stats') return

    const { pinID, pinData } = message.data

    // Remove from pending requests
    pendingRequests.delete(pinID)

    cache.set(pinID, pinData)
    console.log(
      `[PinStats] CONTENT received stats for pin ${pinID}: saves=${pinData.engagement.repins}, comments=${pinData.engagement.comments}, shares=${pinData.engagement.shares}, reactions=${pinData.engagement.reactions}`
    )

    updateOverlay(pinID)
  })

  console.log('[PinStats] Message listener ready')
}

/**
 * Request stats from injector (batched)
 */
function requestStatsFetch(pinID: string): void {
  // Only skip if already pending request
  if (pendingRequests.has(pinID)) return

  // Check if we have valid cached data
  const cached = cache.get(pinID)
  if (cached && hasValidStats(cached)) return

  // If injector not ready, queue for later
  if (!injectorReady) {
    console.log(`[PinStats] Queuing ${pinID} - injector not ready yet`)
    if (!pendingFetchRequests.includes(pinID)) {
      pendingFetchRequests.push(pinID)
    }
    return
  }

  pendingRequests.add(pinID)
  fetchQueue.push(pinID)

  if (fetchTimer) clearTimeout(fetchTimer)

  fetchTimer = setTimeout(() => {
    if (fetchQueue.length === 0) return

    const batch = fetchQueue.splice(0, MAX_BATCH_SIZE)
    const message: FetchStatsRequest = {
      source: CONTENT_SOURCE_ID,
      type: 'fetch-stats',
      data: { pinIDs: batch },
    }

    console.log(`[PinStats] Requesting stats for ${batch.length} pins:`, batch)
    window.postMessage(message, window.origin)

    // Continue processing queue if more items
    if (fetchQueue.length > 0) {
      setTimeout(() => requestStatsFetch(fetchQueue[0]), FETCH_DELAY_MS)
    }
  }, FETCH_DELAY_MS)
}

/**
 * Extract pin ID from URL
 */
function extractPinIDFromUrl(url: string): string | null {
  const match = url.match(/\/pin\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Extract pin ID from element (multiple strategies)
 */
function extractPinID(element: Element): string | null {
  // Strategy 1: data-test-pin-id
  const testPinID = element.getAttribute('data-test-pin-id')
  if (testPinID) return testPinID

  // Strategy 2: Check parent for data-test-pin-id
  const parent = element.closest('[data-test-pin-id]')
  if (parent) return parent.getAttribute('data-test-pin-id')

  // Strategy 3: Find link with /pin/ URL
  const link = element.querySelector('a[href*="/pin/"]') as HTMLAnchorElement
  if (link) {
    const id = extractPinIDFromUrl(link.href)
    if (id) return id
  }

  // Strategy 4: Check if element itself is a link
  if (element.tagName === 'A') {
    const id = extractPinIDFromUrl((element as HTMLAnchorElement).href)
    if (id) return id
  }

  // Strategy 5: Check parent link
  const parentLink = element.closest('a[href*="/pin/"]') as HTMLAnchorElement
  if (parentLink) {
    const id = extractPinIDFromUrl(parentLink.href)
    if (id) return id
  }

  return null
}

/**
 * Create overlay element - Glassmorphism design with horizontal layout
 * Styles are in src/styles.css
 */
function createOverlay(pinID: string, data: PinData | undefined, isLoading: boolean): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'pinstats-overlay'
  if (isLoading) {
    overlay.classList.add('pinstats-loading')
  }
  overlay.dataset.pinId = pinID

  const e = data?.engagement
  const d = data?.details

  // Create stats container (horizontal layout via CSS)
  const stats = document.createElement('div')
  stats.className = 'pinstats-stats'

  const statItems = [
    { class: 'stat-saves', icon: '📌', value: e?.repins ?? 0, title: 'Saves' },
    { class: 'stat-comments', icon: '💬', value: e?.comments ?? 0, title: 'Comments' },
    { class: 'stat-shares', icon: '🔗', value: e?.shares ?? 0, title: 'Shares' },
    { class: 'stat-reactions', icon: '❤️', value: e?.reactions ?? 0, title: 'Reactions' },
    { class: 'stat-age', icon: '📅', value: d?.createdAgo || '—', title: 'Age' },
  ]

  statItems.forEach(({ class: className, icon, value, title }) => {
    const item = document.createElement('div')
    item.className = `stat-item ${className}`
    item.title = title

    const iconSpan = document.createElement('span')
    iconSpan.className = 'stat-icon'
    iconSpan.textContent = icon

    const valueSpan = document.createElement('span')
    valueSpan.className = 'stat-value'
    valueSpan.textContent = typeof value === 'number' ? formatNumber(value) : value

    item.appendChild(iconSpan)
    item.appendChild(valueSpan)

    // Add loader element when loading
    if (isLoading) {
      const loader = document.createElement('span')
      loader.className = 'pinstats-loader'
      item.appendChild(loader)
    }

    stats.appendChild(item)
  })

  // Download button (inline with stats)
  const downloadBtn = document.createElement('button')
  downloadBtn.className = 'pinstats-download'
  downloadBtn.title = 'Download'
  downloadBtn.textContent = '⬇️'
  downloadBtn.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    handleDownload(pinID)
  })

  stats.appendChild(downloadBtn)
  overlay.appendChild(stats)

  return overlay
}

/**
 * Handle download click
 */
function handleDownload(pinID: string): void {
  const data = cache.get(pinID)
  const url = data?.details.originalVideoUrl || data?.details.originalImageUrl

  if (!url) {
    console.warn(`[PinStats] No download URL for pin ${pinID}`)
    return
  }

  const ext = data?.details.isVideo ? 'mp4' : 'jpg'
  const request: DownloadRequest = {
    action: 'downloadPin',
    pinID,
    imageUrl: url,
    filename: `pin-${pinID}.${ext}`,
  }

  chrome.runtime.sendMessage(request, (response: DownloadResponse) => {
    if (response?.success) {
      console.log(`[PinStats] Download started: pin ${pinID}`)
    } else {
      console.error(`[PinStats] Download failed: ${response?.error}`)
    }
  })
}

/**
 * Find pin container from a link element
 * Traverses up to find a suitable container with an image
 */
function findPinContainer(link: Element): HTMLElement | null {
  let current = link.parentElement
  let depth = 0
  const maxDepth = 8

  while (current && depth < maxDepth) {
    // Check if this container has an image (likely a pin card)
    const hasImage = current.querySelector('img') !== null
    // Check if it's a reasonable size (not too small, not the whole page)
    const rect = current.getBoundingClientRect()
    const isReasonableSize = rect.width > 100 && rect.width < 800 && rect.height > 100

    if (hasImage && isReasonableSize) {
      return current as HTMLElement
    }

    current = current.parentElement
    depth++
  }

  return null
}

/**
 * Check if cached data has valid stats from direct API fetch
 * Note: Homefeed responses only have reactions, but not saves/comments/shares
 * We need a direct fetch to /resource/PinResource/get/ to get full stats
 */
function hasValidStats(data: PinData | undefined): boolean {
  if (!data) return false
  const e = data.engagement
  // IMPORTANT: Only consider valid if we have saves (repins) OR comments
  // Reactions alone come from homefeed but we need the full stats
  return e.repins > 0 || e.comments > 0
}

/**
 * Process a pin container - add overlay
 */
function processPinContainer(container: HTMLElement, pinID: string): void {
  // Skip if already processed
  if (processedContainers.has(container)) return
  if (container.querySelector('.pinstats-overlay')) return

  processedContainers.add(container)

  // Ensure relative positioning
  const position = getComputedStyle(container).position
  if (position === 'static') {
    container.style.position = 'relative'
  }

  // Get cached data
  const cachedData = cache.get(pinID)
  const valid = hasValidStats(cachedData)

  // Determine loading state - loading if no valid cached stats
  const isLoading = !cachedData || !valid

  // Create and add overlay
  const overlay = createOverlay(pinID, cachedData, isLoading)
  container.appendChild(overlay)

  console.log(
    `[PinStats] Pin ${pinID}: cached=${!!cachedData}, validStats=${valid}, injectorReady=${injectorReady}`
  )

  // Request stats if not cached OR cached data has no real stats
  if (!cachedData || !valid) {
    console.log(`[PinStats] Will request stats for pin ${pinID}`)
    requestStatsFetch(pinID)
  }
}

/**
 * Scan page for pins using link-based detection
 */
function scanForPins(): void {
  // Find all pin links
  const pinLinks = document.querySelectorAll('a[href*="/pin/"]')
  let processedCount = 0

  pinLinks.forEach((link) => {
    const pinID = extractPinIDFromUrl((link as HTMLAnchorElement).href)
    if (!pinID) return

    // Find the container for this pin
    const container = findPinContainer(link)
    if (!container) return

    // Skip if already has overlay
    if (container.querySelector('.pinstats-overlay')) return

    processPinContainer(container, pinID)
    processedCount++
  })

  if (processedCount > 0) {
    console.log(`[PinStats] Processed ${processedCount} new pins`)
  }
}

/**
 * Set up MutationObserver with debouncing
 */
function setupObserver(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const MUTATION_DEBOUNCE_MS = 500 // Increased from 100ms for Pinterest's dynamic DOM

  mutationObserver = new MutationObserver((mutations) => {
    let hasNewNodes = false

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true
      }
    })

    // Only scan if new nodes were added
    if (hasNewNodes) {
      // Debounce: clear previous timer and start new one
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(scanForPins, MUTATION_DEBOUNCE_MS)
    }
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })

  console.log('[PinStats] MutationObserver started')
}

/**
 * Refresh all overlays with latest cache data
 */
function refreshOverlays(): void {
  const overlays = document.querySelectorAll('.pinstats-overlay[data-pin-id]')
  overlays.forEach((overlay) => {
    const pinID = (overlay as HTMLElement).dataset.pinId
    if (pinID && cache.has(pinID)) {
      updateOverlay(pinID)
    }
  })
}

/**
 * Cleanup resources on page unload
 * Prevents memory leaks and ensures data is saved
 */
function setupCleanup(): void {
  window.addEventListener('beforeunload', () => {
    console.log('[PinStats] Cleaning up...')

    // Stop mutation observer
    if (mutationObserver) {
      mutationObserver.disconnect()
      mutationObserver = null
    }

    // Clear intervals
    if (scanIntervalId !== null) {
      window.clearInterval(scanIntervalId)
      scanIntervalId = null
    }
    if (refreshIntervalId !== null) {
      window.clearInterval(refreshIntervalId)
      refreshIntervalId = null
    }
    if (syncIntervalId !== null) {
      window.clearInterval(syncIntervalId)
      syncIntervalId = null
    }

    // Clear fetch timer
    if (fetchTimer) {
      clearTimeout(fetchTimer)
      fetchTimer = null
    }

    // Final sync to storage
    cache.syncNow()
  })
}

/**
 * Initialize
 */
async function init(): Promise<void> {
  console.log('[PinStats] Content script initializing...')

  // 1. CRITICAL: Set up message listener FIRST before anything else
  // This ensures we don't miss any messages from the injector
  setupMessageListener()

  // 2. Initialize cache from storage
  await cache.initFromStorage()

  // 3. Start storage sync
  syncIntervalId = cache.startStorageSync()

  // 4. Inject the interceptor (messages will be caught)
  injectScript()

  // 5. Wait for DOM ready, then start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupObserver()
      // Delay initial scan to let Pinterest render
      setTimeout(scanForPins, 1000)
    })
  } else {
    setupObserver()
    // Delay initial scan
    setTimeout(scanForPins, 500)
  }

  // 6. Periodic scan (Pinterest uses infinite scroll)
  scanIntervalId = window.setInterval(scanForPins, 3000)

  // 7. Periodic refresh of overlay values
  refreshIntervalId = window.setInterval(refreshOverlays, 2000)

  // 8. Set up cleanup on page unload
  setupCleanup()

  console.log('[PinStats] Content script initialized')
}

// Run
init()
