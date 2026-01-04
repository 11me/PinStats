/**
 * Pinterest API response types
 * Based on competitor analysis - comprehensive stats structure
 */

/**
 * Engagement metrics extracted from Pinterest API
 */
export interface PinEngagement {
  repins: number      // repin_count - saves
  comments: number    // aggregated_pin_data.comment_count
  shares: number      // share_count
  reactions: number   // sum of reaction_counts object
}

/**
 * Pin details including media URLs and metadata
 */
export interface PinDetails {
  id: string
  title: string
  description: string
  link: string
  createdAt: string       // ISO date string
  createdAgo: string      // "1Y", "9M", "5D", "0D"
  originalImageUrl: string
  originalVideoUrl: string
  isVideo: boolean
  pinType: 'image' | 'video' | 'carousel'
}

/**
 * External data for bookmarking feature
 */
export interface PinExternalData {
  bookmarked: boolean
  savedAt: string
  updatedAt: string
}

/**
 * Complete pin data structure matching competitor
 * Stored in observedPinIds cache
 */
export interface PinData {
  engagement: PinEngagement
  details: PinDetails
  externalData: PinExternalData
}

/**
 * Raw reaction counts from Pinterest API
 */
export interface ReactionCounts {
  like?: number
  heart?: number
  wow?: number
  haha?: number
  love?: number
  [key: string]: number | undefined
}

/**
 * Legacy type for backwards compatibility
 */
export interface PinStats {
  pinID: string
  repin_count: number
  reaction_counts: ReactionCounts
  origin_url: string
  created_at: string
}

/**
 * Pinterest API resource response structure
 */
export interface PinterestResourceResponse {
  resource_response: {
    data: {
      id: string
      grid_title?: string
      closeup_description?: string
      link?: string
      created_at?: string
      repin_count?: number
      share_count?: number
      reaction_counts?: ReactionCounts
      aggregated_pin_data?: {
        comment_count?: number
        aggregated_stats?: {
          saves?: number
          done?: number
        }
      }
      images?: {
        orig?: { url: string }
        '736x'?: { url: string }
        '474x'?: { url: string }
        '236x'?: { url: string }
      }
      videos?: {
        video_list?: {
          V_720P?: { url: string }
          V_480P?: { url: string }
        }
      }
      carousel_data?: unknown
      is_repin?: boolean
      is_promoted?: boolean
    }
  }
}
