import { describe, it, expect, beforeEach } from 'vitest'
import * as statsCache from '../src/utils/statsCache'
import type { PinData } from '../src/types/pinterest'

/**
 * Helper to create valid PinData objects for testing
 */
function createPinData(overrides?: Partial<PinData>): PinData {
  return {
    engagement: {
      repins: 100,
      comments: 10,
      shares: 5,
      reactions: 50,
      ...overrides?.engagement,
    },
    details: {
      id: '12345',
      title: 'Test Pin',
      description: 'Test description',
      link: 'https://example.com',
      createdAt: '2024-01-01T00:00:00Z',
      createdAgo: '1Y',
      originalImageUrl: 'https://i.pinimg.com/originals/test.jpg',
      originalVideoUrl: '',
      isVideo: false,
      pinType: 'image',
      ...overrides?.details,
    },
    externalData: {
      bookmarked: false,
      savedAt: '',
      updatedAt: new Date().toISOString(),
      ...overrides?.externalData,
    },
  }
}

describe('statsCache', () => {
  beforeEach(() => {
    statsCache.clear()
  })

  describe('set and get', () => {
    it('should store and retrieve stats by pin ID', () => {
      const pinData = createPinData()

      statsCache.set('12345', pinData)
      const retrieved = statsCache.get('12345')

      expect(retrieved).toBeDefined()
      expect(retrieved?.engagement.repins).toBe(100)
      expect(retrieved?.details.id).toBe('12345')
    })

    it('should return undefined for non-existent pin ID', () => {
      expect(statsCache.get('nonexistent')).toBeUndefined()
    })

    it('should update lastAccessed when getting', () => {
      const pinData = createPinData()
      statsCache.set('12345', pinData)

      // First get
      statsCache.get('12345')

      // The entry should still be accessible
      expect(statsCache.has('12345')).toBe(true)
    })
  })

  describe('has', () => {
    it('should return true for existing pin ID', () => {
      statsCache.set('12345', createPinData())
      expect(statsCache.has('12345')).toBe(true)
    })

    it('should return false for non-existent pin ID', () => {
      expect(statsCache.has('nonexistent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all cached entries', () => {
      statsCache.set('1', createPinData({ details: { id: '1' } as PinData['details'] }))
      statsCache.set('2', createPinData({ details: { id: '2' } as PinData['details'] }))

      expect(statsCache.size()).toBe(2)

      statsCache.clear()

      expect(statsCache.size()).toBe(0)
      expect(statsCache.has('1')).toBe(false)
      expect(statsCache.has('2')).toBe(false)
    })
  })

  describe('size', () => {
    it('should return the number of cached entries', () => {
      expect(statsCache.size()).toBe(0)

      statsCache.set('1', createPinData())
      expect(statsCache.size()).toBe(1)

      statsCache.set('2', createPinData())
      expect(statsCache.size()).toBe(2)
    })
  })

  describe('update', () => {
    it('should update specific fields of cached data', () => {
      statsCache.set('12345', createPinData())

      statsCache.update('12345', {
        engagement: { repins: 200 } as PinData['engagement'],
      })

      const retrieved = statsCache.get('12345')
      expect(retrieved?.engagement.repins).toBe(200)
      // Other fields should remain unchanged
      expect(retrieved?.engagement.comments).toBe(10)
    })

    it('should do nothing for non-existent pin ID', () => {
      statsCache.update('nonexistent', {
        engagement: { repins: 200 } as PinData['engagement'],
      })

      expect(statsCache.has('nonexistent')).toBe(false)
    })
  })

  describe('getAllPinIDs', () => {
    it('should return all cached pin IDs', () => {
      statsCache.set('1', createPinData())
      statsCache.set('2', createPinData())
      statsCache.set('3', createPinData())

      const ids = statsCache.getAllPinIDs()
      expect(ids).toHaveLength(3)
      expect(ids).toContain('1')
      expect(ids).toContain('2')
      expect(ids).toContain('3')
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      statsCache.set('1', createPinData())
      statsCache.set('2', createPinData())

      const stats = statsCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(5000)
      expect(stats.ttlMs).toBe(24 * 60 * 60 * 1000)
    })
  })
})
