/**
 * Stats cache for storing Pinterest pin statistics
 * LRU cache with eviction and TTL support:
 * 1. In-memory cache with max size limit (LRU eviction)
 * 2. chrome.storage.local (persistence across sessions)
 * 3. DOM re-attachment (cache-first rendering)
 */

import type { PinData } from '../types/pinterest'

// Cache configuration
const MAX_CACHE_SIZE = 5000 // Max pins to keep in memory
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Storage key for chrome.storage.local
const STORAGE_KEY = 'pinsData'

// Sync interval in milliseconds
const SYNC_INTERVAL = 2000

// Track if initialized from storage
let initialized = false

// Cache entry with timestamp for LRU and TTL
interface CacheEntry {
  data: PinData
  timestamp: number
  lastAccessed: number
}

// LRU cache using Map (maintains insertion order)
const cache = new Map<string, CacheEntry>()

/**
 * Evict oldest entries if cache exceeds max size
 */
function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE_SIZE) return

  // Get entries sorted by lastAccessed (oldest first)
  const entries = Array.from(cache.entries())
  entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

  // Remove oldest entries until we're under the limit
  const toRemove = cache.size - MAX_CACHE_SIZE
  for (let i = 0; i < toRemove; i++) {
    cache.delete(entries[i][0])
  }

  console.log(`[PinStats] Evicted ${toRemove} old cache entries`)
}

/**
 * Remove expired entries
 */
function removeExpired(): void {
  const now = Date.now()
  let removed = 0

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key)
      removed++
    }
  }

  if (removed > 0) {
    console.log(`[PinStats] Removed ${removed} expired cache entries`)
  }
}

/**
 * Initialize cache from chrome.storage.local
 * Call this once when content script loads
 */
export async function initFromStorage(): Promise<void> {
  if (initialized) return

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      const stored = result[STORAGE_KEY] as Record<string, CacheEntry | PinData>
      const now = Date.now()

      // Import from storage, handling both old and new formats
      for (const [pinID, entry] of Object.entries(stored)) {
        // Check if it's the new format (has timestamp) or old format (just PinData)
        if ('timestamp' in entry && 'data' in entry) {
          // New format - check TTL
          if (now - entry.timestamp < CACHE_TTL_MS) {
            cache.set(pinID, entry as CacheEntry)
          }
        } else {
          // Old format - migrate to new format
          cache.set(pinID, {
            data: entry as PinData,
            timestamp: now,
            lastAccessed: now,
          })
        }
      }

      // Evict if we loaded too many
      evictIfNeeded()

      console.log(`[PinStats] Restored ${cache.size} pins from storage`)
    }
    initialized = true
  } catch (error) {
    console.error('[PinStats] Failed to restore from storage:', error)
    initialized = true // Mark as initialized to prevent retry loops
  }
}

/**
 * Sync in-memory cache to chrome.storage.local
 * Called periodically by setInterval
 */
async function syncToStorage(): Promise<void> {
  try {
    // Remove expired before syncing
    removeExpired()

    // Convert Map to object for storage
    const toStore: Record<string, CacheEntry> = {}
    for (const [key, value] of cache.entries()) {
      toStore[key] = value
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: toStore })
  } catch (error) {
    console.error('[PinStats] Failed to sync to storage:', error)
  }
}

/**
 * Sync immediately (used during cleanup)
 */
export function syncNow(): void {
  syncToStorage()
}

/**
 * Start periodic sync to storage
 * Returns interval ID for cleanup if needed
 */
export function startStorageSync(): number {
  return window.setInterval(syncToStorage, SYNC_INTERVAL)
}

/**
 * Store pin data in cache
 * @param pinID - Pinterest pin ID
 * @param data - Complete pin data with engagement, details, externalData
 */
export function set(pinID: string, data: PinData): void {
  const now = Date.now()
  cache.set(pinID, {
    data,
    timestamp: now,
    lastAccessed: now,
  })

  // Evict old entries if needed
  evictIfNeeded()
}

/**
 * Get pin data from cache
 * Updates lastAccessed for LRU tracking
 * @param pinID - Pinterest pin ID
 * @returns PinData if cached and not expired, undefined otherwise
 */
export function get(pinID: string): PinData | undefined {
  const entry = cache.get(pinID)
  if (!entry) return undefined

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(pinID)
    return undefined
  }

  // Update lastAccessed for LRU
  entry.lastAccessed = Date.now()

  return entry.data
}

/**
 * Check if pin is in cache (and not expired)
 * Critical for cache-first rendering pattern
 * @param pinID - Pinterest pin ID
 */
export function has(pinID: string): boolean {
  const entry = cache.get(pinID)
  if (!entry) return false

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(pinID)
    return false
  }

  return true
}

/**
 * Clear all cached data (memory only)
 * Does NOT clear chrome.storage.local
 */
export function clear(): void {
  cache.clear()
}

/**
 * Clear all cached data including storage
 */
export async function clearAll(): Promise<void> {
  clear()
  try {
    await chrome.storage.local.remove(STORAGE_KEY)
    console.log('[PinStats] Cleared all cached data')
  } catch (error) {
    console.error('[PinStats] Failed to clear storage:', error)
  }
}

/**
 * Get count of cached pins
 */
export function size(): number {
  return cache.size
}

/**
 * Get all cached pin IDs
 * Useful for debugging
 */
export function getAllPinIDs(): string[] {
  return Array.from(cache.keys())
}

/**
 * Update specific fields of cached pin data
 * Useful for partial updates (e.g., bookmarking)
 */
export function update(pinID: string, updates: Partial<PinData>): void {
  const entry = cache.get(pinID)
  if (!entry) return

  entry.data = {
    ...entry.data,
    ...updates,
    // Deep merge engagement if provided
    engagement: {
      ...entry.data.engagement,
      ...(updates.engagement || {}),
    },
    // Deep merge details if provided
    details: {
      ...entry.data.details,
      ...(updates.details || {}),
    },
    // Deep merge externalData if provided
    externalData: {
      ...entry.data.externalData,
      ...(updates.externalData || {}),
    },
  }

  // Update lastAccessed
  entry.lastAccessed = Date.now()
}

/**
 * Get cache statistics
 * Useful for debugging and monitoring
 */
export function getStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  }
}
