import { describe, it, expect, beforeEach } from 'vitest'
import * as statsCache from '../src/utils/statsCache'

describe('statsCache', () => {
  beforeEach(() => {
    statsCache.clear()
  })

  describe('set and get', () => {
    it('should store and retrieve stats by pin ID', () => {
      const stats = {
        repin_count: 100,
        reaction_counts: { like: 50 },
        origin_url: 'https://example.com/image.jpg',
        created_at: '2024-01-01T00:00:00Z',
      }

      statsCache.set('12345', stats)
      const retrieved = statsCache.get('12345')

      expect(retrieved).toEqual(stats)
    })

    it('should return undefined for non-existent pin ID', () => {
      expect(statsCache.get('nonexistent')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for existing pin ID', () => {
      statsCache.set('12345', {
        repin_count: 0,
        reaction_counts: {},
        origin_url: '',
        created_at: '',
      })

      expect(statsCache.has('12345')).toBe(true)
    })

    it('should return false for non-existent pin ID', () => {
      expect(statsCache.has('nonexistent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all cached entries', () => {
      statsCache.set('1', { repin_count: 1, reaction_counts: {}, origin_url: '', created_at: '' })
      statsCache.set('2', { repin_count: 2, reaction_counts: {}, origin_url: '', created_at: '' })

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

      statsCache.set('1', { repin_count: 1, reaction_counts: {}, origin_url: '', created_at: '' })
      expect(statsCache.size()).toBe(1)

      statsCache.set('2', { repin_count: 2, reaction_counts: {}, origin_url: '', created_at: '' })
      expect(statsCache.size()).toBe(2)
    })
  })
})
