/**
 * Background service worker
 * Handles file downloads to bypass CORS restrictions
 */

import type { DownloadRequest, DownloadResponse } from './types/messages'

// Extension enable/disable state
const STORAGE_KEY_ENABLED = 'extensionEnabled'

/**
 * Check if extension is enabled
 */
async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY_ENABLED)
    return result[STORAGE_KEY_ENABLED] !== false // Default to true
  } catch {
    return true // Fail-open
  }
}

/**
 * Validate that URL is from Pinterest CDN
 * Prevents downloading from malicious sources
 */
function isValidPinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Allow Pinterest CDN domains only
    const allowedDomains = [
      'i.pinimg.com',      // Images
      'v.pinimg.com',      // Videos
      's-media-cache-ak0.pinimg.com',  // Legacy image cache
    ]

    return allowedDomains.includes(hostname)
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Extract file extension from URL
 */
function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase()
    return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4'].includes(ext)
      ? ext
      : 'jpg'
  } catch {
    return 'jpg'
  }
}

/**
 * Handle download request from content script
 */
async function handleDownloadRequest(
  request: DownloadRequest,
  sendResponse: (response: DownloadResponse) => void
): Promise<void> {
  // Check if extension is enabled
  const enabled = await isExtensionEnabled()
  if (!enabled) {
    sendResponse({
      success: false,
      error: 'Extension is disabled',
    })
    return
  }

  const { pinID, imageUrl } = request

  // Validate URL is from Pinterest CDN
  if (!isValidPinterestUrl(imageUrl)) {
    console.error(`[PinStats] Rejected download from untrusted source: ${imageUrl}`)
    sendResponse({
      success: false,
      error: 'Invalid URL: Only Pinterest CDN URLs are allowed',
    })
    return
  }

  const ext = getFileExtension(imageUrl)
  const filename = `pin-${pinID}.${ext}`

  chrome.downloads.download(
    {
      url: imageUrl,
      filename,
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        })
      } else {
        sendResponse({
          success: true,
          downloadId,
        })
      }
    }
  )
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'downloadPin') {
    handleDownloadRequest(request as DownloadRequest, sendResponse)
    return true // Keep channel open for async response
  }
  return false
})

console.log('[PinStats] Background service worker initialized')
