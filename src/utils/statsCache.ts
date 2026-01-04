/**
 * Stats cache for storing Pinterest pin statistics
 * Three-layer architecture matching competitor:
 * 1. In-memory cache (fast lookups)
 * 2. chrome.storage.local (persistence across sessions)
 * 3. DOM re-attachment (cache-first rendering)
 */

import type { PinData } from '../types/pinterest'

// In-memory cache for fast O(1) lookups
// Key pattern matches competitor: observedPinIds[pinID]
const observedPinIds: Record<string, PinData> = {}

// Storage key for chrome.storage.local
const STORAGE_KEY = 'pinsData'

// Sync interval in milliseconds (competitor uses 2000ms)
const SYNC_INTERVAL = 2000

// Track if initialized from storage
let initialized = false

/**
 * Initialize cache from chrome.storage.local
 * Call this once when content script loads
 */
export async function initFromStorage(): Promise<void> {
  if (initialized) return

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      Object.assign(observedPinIds, result[STORAGE_KEY])
      console.log(`[PinStats] Restored ${Object.keys(observedPinIds).length} pins from storage`)
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
    await chrome.storage.local.set({ [STORAGE_KEY]: observedPinIds })
  } catch (error) {
    console.error('[PinStats] Failed to sync to storage:', error)
  }
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
  observedPinIds[pinID] = data
}

/**
 * Get pin data from cache
 * @param pinID - Pinterest pin ID
 * @returns PinData if cached, undefined otherwise
 */
export function get(pinID: string): PinData | undefined {
  return observedPinIds[pinID]
}

/**
 * Check if pin is in cache
 * Critical for cache-first rendering pattern
 * @param pinID - Pinterest pin ID
 */
export function has(pinID: string): boolean {
  return pinID in observedPinIds
}

/**
 * Clear all cached data (memory only)
 * Does NOT clear chrome.storage.local
 */
export function clear(): void {
  for (const key in observedPinIds) {
    delete observedPinIds[key]
  }
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
  return Object.keys(observedPinIds).length
}

/**
 * Get all cached pin IDs
 * Useful for debugging
 */
export function getAllPinIDs(): string[] {
  return Object.keys(observedPinIds)
}

/**
 * Update specific fields of cached pin data
 * Useful for partial updates (e.g., bookmarking)
 */
export function update(pinID: string, updates: Partial<PinData>): void {
  if (observedPinIds[pinID]) {
    observedPinIds[pinID] = {
      ...observedPinIds[pinID],
      ...updates,
      // Deep merge engagement if provided
      engagement: {
        ...observedPinIds[pinID].engagement,
        ...(updates.engagement || {}),
      },
      // Deep merge details if provided
      details: {
        ...observedPinIds[pinID].details,
        ...(updates.details || {}),
      },
      // Deep merge externalData if provided
      externalData: {
        ...observedPinIds[pinID].externalData,
        ...(updates.externalData || {}),
      },
    }
  }
}

// Export the raw cache for direct access if needed (matches competitor pattern)
export { observedPinIds }
