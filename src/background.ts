/**
 * Background service worker
 * Handles file downloads to bypass CORS restrictions
 */

import type { DownloadRequest, DownloadResponse } from './types/messages'

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
function handleDownloadRequest(
  request: DownloadRequest,
  sendResponse: (response: DownloadResponse) => void
): void {
  const { pinID, imageUrl } = request
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
