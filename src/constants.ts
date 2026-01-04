/**
 * Shared constants across content script and injector
 * Single source of truth for message source identifiers
 */

export const MESSAGE_SOURCES = {
  INJECTOR: 'pinstats-injector',
  CONTENT: 'pinstats-content',
} as const

// Export individual constants for backwards compatibility
export const SOURCE_ID = MESSAGE_SOURCES.INJECTOR
export const CONTENT_SOURCE_ID = MESSAGE_SOURCES.CONTENT
