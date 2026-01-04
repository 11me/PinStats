/**
 * Message types for inter-script communication
 */

import type { PinData } from './pinterest'

/**
 * Message sent from injector.ts to content.ts via postMessage
 * Contains complete pin data with all 6 stats
 */
export interface PostMessagePayload {
  source: 'pinstats-injector'
  type: 'pin-stats'
  data: {
    pinID: string
    pinData: PinData
  }
}

/**
 * Message sent from injector.ts to content.ts when injector is ready
 * Signals that the injector's message listener is set up
 */
export interface InjectorReadyMessage {
  source: 'pinstats-injector'
  type: 'injector-ready'
}

/**
 * Union type for all messages from injector to content script
 */
export type InjectorMessage = PostMessagePayload | InjectorReadyMessage

/**
 * Message sent from content.ts to injector.ts via postMessage
 * Requests the injector to fetch stats for specific pins
 */
export interface FetchStatsRequest {
  source: 'pinstats-content'
  type: 'fetch-stats'
  data: {
    pinIDs: string[]
  }
}

/**
 * Message sent from popup.ts to content.ts via chrome.tabs.sendMessage
 * Requests the content script to reload the page
 */
export interface ReloadPageMessage {
  type: 'reload-page'
}

/**
 * Message sent from content.ts to background.ts via chrome.runtime.sendMessage
 */
export interface DownloadRequest {
  action: 'downloadPin'
  pinID: string
  imageUrl: string
  videoUrl?: string
  filename: string
}

/**
 * Response from background.ts to content.ts
 */
export interface DownloadResponse {
  success: boolean
  downloadId?: number
  error?: string
}
