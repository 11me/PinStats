/**
 * Fetch interceptor - runs in MAIN world (page context)
 * Monkey patches window.fetch AND XMLHttpRequest to capture Pinterest API responses
 * Extracts all 6 stats: saves, comments, shares, reactions, age, media URLs
 */

import type { PostMessagePayload, FetchStatsRequest, InjectorReadyMessage } from './types/messages'
import type { PinData, PinEngagement, PinDetails, ReactionCounts, PinterestResourceResponse } from './types/pinterest'

const SOURCE_ID = 'pinstats-injector'
const CONTENT_SOURCE_ID = 'pinstats-content'
const API_PATTERNS = ['/resource/', 'graphql', '/v3/', 'PinResource', 'UserHomefeed']

// Track pins we've already tried to fetch (avoid duplicate requests)
const fetchedPins = new Set<string>()

// Rate limiting state
let lastFetchTime = 0
const MIN_FETCH_INTERVAL_MS = 300

// Store originals
const originalFetch = window.fetch
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

/**
 * Calculate age string from ISO date
 * Returns: "1Y", "9M", "5D", "0D"
 */
function calculateAge(dateStr: string): string {
  if (!dateStr) return '—'

  try {
    const created = new Date(dateStr)
    const now = new Date()

    const years = now.getFullYear() - created.getFullYear()
    const months = now.getMonth() - created.getMonth() + (years * 12)
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (years > 0) return `${years}Y`
    if (months > 0) return `${months}M`
    if (days > 0) return `${days}D`
    return '0D'
  } catch {
    return '—'
  }
}

/**
 * Sum all reaction counts
 */
function sumReactions(reactions: ReactionCounts | undefined): number {
  if (!reactions) return 0
  return Object.values(reactions).reduce((sum, val) => sum + (val ?? 0), 0)
}

/**
 * Determine pin type from data
 */
function detectPinType(data: Record<string, unknown>): 'image' | 'video' | 'carousel' {
  if (data.carousel_data) return 'carousel'
  if (data.videos || data.is_video) return 'video'
  return 'image'
}

/**
 * Extract complete PinData from a raw Pinterest object
 */
function extractPinData(record: Record<string, unknown>): PinData | null {
  const id = record.id as string
  if (!id || !/^\d+$/.test(id)) return null

  // Extract engagement stats
  const aggData = record.aggregated_pin_data as Record<string, unknown> | undefined
  const aggStats = aggData?.aggregated_stats as Record<string, unknown> | undefined

  const engagement: PinEngagement = {
    repins: (record.repin_count as number) ?? (aggStats?.saves as number) ?? 0,
    comments: (aggData?.comment_count as number) ?? 0,
    shares: (record.share_count as number) ?? 0,
    reactions: sumReactions(record.reaction_counts as ReactionCounts),
  }

  // Extract images
  const images = record.images as Record<string, { url?: string }> | undefined
  let originalImageUrl = ''
  if (images) {
    originalImageUrl = images.orig?.url ?? images['736x']?.url ?? images['474x']?.url ?? images['236x']?.url ?? ''
  }
  if (!originalImageUrl && record.image_large_url) {
    originalImageUrl = record.image_large_url as string
  }

  // Extract video
  let originalVideoUrl = ''
  const videos = record.videos as Record<string, Record<string, { url?: string }>> | undefined
  if (videos?.video_list) {
    originalVideoUrl = videos.video_list.V_720P?.url ?? videos.video_list.V_480P?.url ?? ''
  }

  const createdAt = (record.created_at as string) ?? ''

  const details: PinDetails = {
    id,
    title: (record.grid_title as string) ?? '',
    description: (record.closeup_description as string) ?? (record.description as string) ?? '',
    link: (record.link as string) ?? '',
    createdAt,
    createdAgo: calculateAge(createdAt),
    originalImageUrl,
    originalVideoUrl,
    isVideo: Boolean(originalVideoUrl),
    pinType: detectPinType(record),
  }

  return {
    engagement,
    details,
    externalData: {
      bookmarked: false,
      savedAt: '',
      updatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Extract all pins from batch responses recursively
 */
function extractAllPins(data: unknown): Array<{ pinID: string; pinData: PinData }> {
  const pins: Array<{ pinID: string; pinData: PinData }> = []
  const seenIDs = new Set<string>()

  function findAllPins(obj: unknown, depth = 0): void {
    if (depth > 20 || !obj || typeof obj !== 'object') return

    const record = obj as Record<string, unknown>

    // Check if this looks like a pin object (must have numeric ID)
    if (record.id && typeof record.id === 'string' && /^\d+$/.test(record.id)) {
      const pinID = record.id

      if (!seenIDs.has(pinID)) {
        const pinData = extractPinData(record)
        if (pinData && (pinData.details.originalImageUrl || pinData.engagement.repins > 0)) {
          seenIDs.add(pinID)
          pins.push({ pinID, pinData })
        }
      }
    }

    // Recurse into all properties
    for (const key of Object.keys(record)) {
      const value = record[key]
      if (Array.isArray(value)) {
        for (const item of value) {
          findAllPins(item, depth + 1)
        }
      } else if (value && typeof value === 'object') {
        findAllPins(value, depth + 1)
      }
    }
  }

  findAllPins(data)
  return pins
}

/**
 * Check if URL matches Pinterest API patterns
 */
function isPinterestApiUrl(url: string): boolean {
  return API_PATTERNS.some((pattern) => url.includes(pattern))
}

/**
 * Send extracted stats to content script via postMessage
 */
function sendToContentScript(pinID: string, pinData: PinData): void {
  const message: PostMessagePayload = {
    source: SOURCE_ID,
    type: 'pin-stats',
    data: { pinID, pinData },
  }
  window.postMessage(message, '*')
}

/**
 * Process API response data
 */
function processApiResponse(url: string, data: unknown): void {
  try {
    let dataToProcess = data
    const record = data as Record<string, unknown>

    // Handle resource_response wrapper
    if (record.resource_response) {
      const resourceResponse = record.resource_response as Record<string, unknown>
      if (resourceResponse.data) {
        dataToProcess = resourceResponse.data
      }
    }

    // Handle GraphQL data wrapper
    if (record.data) {
      dataToProcess = record.data
    }

    // Extract all pins
    const pins = extractAllPins(dataToProcess)

    // Also try extracting from original data if different
    if (dataToProcess !== data) {
      const morePins = extractAllPins(data)
      morePins.forEach((p) => {
        if (!pins.find((existing) => existing.pinID === p.pinID)) {
          pins.push(p)
        }
      })
    }

    if (pins.length > 0) {
      console.log(`[PinStats] Found ${pins.length} pins in response from ${url.substring(0, 60)}`)
      pins.forEach(({ pinID, pinData }) => {
        const e = pinData.engagement
        console.log(`[PinStats] Pin ${pinID}: saves=${e.repins}, comments=${e.comments}, shares=${e.shares}, reactions=${e.reactions}`)
        sendToContentScript(pinID, pinData)
      })
    } else {
      console.log(`[PinStats] No pins found in response from ${url.substring(0, 60)}`)
    }
  } catch (e) {
    console.log(`[PinStats] Error processing response:`, e)
  }
}

/**
 * Patched fetch function
 */
async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await originalFetch(input, init)

  let url: string
  if (typeof input === 'string') {
    url = input
  } else if (input instanceof URL) {
    url = input.toString()
  } else if (input instanceof Request) {
    url = input.url
  } else {
    url = String(input)
  }

  if (isPinterestApiUrl(url)) {
    try {
      const cloned = response.clone()
      const data = await cloned.json()
      processApiResponse(url, data)
    } catch {
      // Not JSON - ignore
    }
  }

  return response
}

/**
 * Patch XMLHttpRequest to intercept API calls
 */
function patchXHR(): void {
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    (this as XMLHttpRequest & { _pinstatsUrl?: string })._pinstatsUrl = url.toString()
    return originalXHROpen.call(this, method, url, async ?? true, username, password)
  }

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as XMLHttpRequest & { _pinstatsUrl?: string }
    const url = xhr._pinstatsUrl || ''

    if (isPinterestApiUrl(url)) {
      xhr.addEventListener('load', function () {
        try {
          if (xhr.responseType === '' || xhr.responseType === 'text') {
            const data = JSON.parse(xhr.responseText)
            processApiResponse(url, data)
          } else if (xhr.responseType === 'json') {
            processApiResponse(url, xhr.response)
          }
        } catch {
          // Not JSON - ignore
        }
      })
    }

    return originalXHRSend.call(this, body)
  }
}

/**
 * Fetch pin stats directly from Pinterest API
 * Used when stats not available from intercepted responses
 */
async function fetchPinStats(pinID: string): Promise<void> {
  if (fetchedPins.has(pinID)) return
  fetchedPins.add(pinID)

  // Rate limiting
  const now = Date.now()
  const timeSinceLast = now - lastFetchTime
  if (timeSinceLast < MIN_FETCH_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_FETCH_INTERVAL_MS - timeSinceLast))
  }
  lastFetchTime = Date.now()

  try {
    const baseUrl = `${document.location.protocol}//${document.location.hostname}/resource/PinResource/get/`

    const requestData = {
      options: {
        id: pinID,
        field_set_key: 'detailed',
        fetch_visual_search_objects: true,
      },
      context: {},
    }

    const params = new URLSearchParams({
      _: String(Date.now()),
      data: JSON.stringify(requestData),
      source_url: '/homefeed/',
    })

    const url = `${baseUrl}?${params.toString()}`

    console.log(`[PinStats] Fetching pin ${pinID}...`)

    const response = await originalFetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Pinterest-PWS-Handler': 'www/homefeed.js',
        'X-Requested-With': 'XMLHttpRequest', // Pinterest expects this header
      },
    })

    if (response.status === 429) {
      console.log(`[PinStats] Rate limited for pin ${pinID}, will retry later`)
      fetchedPins.delete(pinID)
      return
    }

    if (!response.ok) {
      console.log(`[PinStats] Failed to fetch pin ${pinID}: ${response.status}`)
      return
    }

    const data = (await response.json()) as PinterestResourceResponse
    const pinRecord = data?.resource_response?.data

    // Debug: log raw response structure
    console.log(`[PinStats] Raw response for pin ${pinID}:`, {
      hasData: !!pinRecord,
      repin_count: pinRecord?.repin_count,
      share_count: pinRecord?.share_count,
      aggregated_pin_data: pinRecord?.aggregated_pin_data,
      reaction_counts: pinRecord?.reaction_counts,
    })

    if (pinRecord) {
      const pinData = extractPinData(pinRecord as unknown as Record<string, unknown>)
      if (pinData) {
        console.log(`[PinStats] Extracted for pin ${pinID}:`, pinData.engagement)
        sendToContentScript(pinID, pinData)
      } else {
        console.log(`[PinStats] Could not extract data for pin ${pinID}`)
      }
    } else {
      console.log(`[PinStats] No data in response for pin ${pinID}`)
    }
  } catch (error) {
    console.log(`[PinStats] Error fetching pin ${pinID}:`, error)
    fetchedPins.delete(pinID)
  }
}

/**
 * Handle fetch requests from content script
 */
function setupMessageListener(): void {
  console.log('[PinStats] Injector setting up message listener...')

  window.addEventListener('message', (event) => {
    if (event.source !== window) return

    const message = event.data as FetchStatsRequest
    if (message?.source !== CONTENT_SOURCE_ID) return

    console.log(`[PinStats] Injector received message type: ${message.type}`)

    if (message.type === 'fetch-stats' && message.data?.pinIDs) {
      console.log(`[PinStats] Injector will fetch ${message.data.pinIDs.length} pins:`, message.data.pinIDs)
      message.data.pinIDs.forEach((pinID, index) => {
        setTimeout(() => fetchPinStats(pinID), index * MIN_FETCH_INTERVAL_MS)
      })
    }
  })

  console.log('[PinStats] Injector message listener ready')
}

/**
 * Signal to content script that injector is ready
 */
function signalReady(): void {
  const message: InjectorReadyMessage = {
    source: SOURCE_ID as 'pinstats-injector',
    type: 'injector-ready',
  }
  window.postMessage(message, '*')
  console.log('[PinStats] Injector signaled ready')
}

// Apply patches
window.fetch = patchedFetch
patchXHR()
setupMessageListener()
signalReady() // Signal that we're ready to receive messages

console.log(
  '%c[PinStats] Interceptors initialized (fetch + XHR + direct fetch)',
  'color: #E60023; font-weight: bold; font-size: 14px;',
  'patterns:',
  API_PATTERNS
)

// Expose test function for debugging
;(window as unknown as Record<string, unknown>).__pinstats_test__ = () => {
  console.log('[PinStats] Injection verified!')
  return 'PinStats injector is running!'
}
