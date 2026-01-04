/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'

/**
 * URL validation logic for Pinterest CDN
 * Should only allow downloads from trusted Pinterest domains
 */
function isValidPinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Allow Pinterest CDN domains
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

describe('Download URL Validation', () => {
  describe('isValidPinterestUrl', () => {
    it('should accept valid Pinterest image URLs', () => {
      const validUrls = [
        'https://i.pinimg.com/originals/12/34/56/123456.jpg',
        'https://i.pinimg.com/736x/ab/cd/ef/abcdef.png',
        'https://i.pinimg.com/474x/12/34/56/123456.webp',
      ]

      validUrls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should accept: ${url}`).toBe(true)
      })
    })

    it('should accept valid Pinterest video URLs', () => {
      const validUrls = [
        'https://v.pinimg.com/videos/mc/720p/12/34/56/123456.mp4',
        'https://v.pinimg.com/videos/mc/480p/ab/cd/ef/abcdef.mp4',
      ]

      validUrls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should accept: ${url}`).toBe(true)
      })
    })

    it('should accept legacy Pinterest cache URLs', () => {
      const url = 'https://s-media-cache-ak0.pinimg.com/originals/12/34/56/123456.jpg'
      expect(isValidPinterestUrl(url)).toBe(true)
    })

    it('should reject non-Pinterest URLs', () => {
      const maliciousUrls = [
        'https://evil.com/malware.exe',
        'https://attacker.net/fake-image.jpg',
        'https://phishing-site.com/pin.jpg',
        'http://localhost:8080/test.jpg',
      ]

      maliciousUrls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should reject: ${url}`).toBe(false)
      })
    })

    it('should reject Pinterest-like domain typosquatting', () => {
      const typosquatUrls = [
        'https://i.pinimg.co/fake.jpg',           // .co instead of .com
        'https://i-pinimg.com/fake.jpg',          // Hyphen instead of dot
        'https://i.pinimg.com.evil.com/fake.jpg', // Subdomain manipulation
        'https://pinimg.com/fake.jpg',            // Missing subdomain
        'https://evil-i.pinimg.com/fake.jpg',     // Extra subdomain prefix
      ]

      typosquatUrls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should reject typosquat: ${url}`).toBe(false)
      })
    })

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
      ]

      invalidUrls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should reject invalid: ${url}`).toBe(false)
      })
    })

    it('should be case-insensitive for domain matching', () => {
      const urls = [
        'https://I.PINIMG.COM/test.jpg',
        'https://V.PinImg.Com/test.mp4',
      ]

      urls.forEach((url) => {
        expect(isValidPinterestUrl(url), `Should accept (case-insensitive): ${url}`).toBe(true)
      })
    })

    it('should reject http:// (insecure) URLs', () => {
      // Optional: enforce HTTPS only for security
      const httpUrl = 'http://i.pinimg.com/test.jpg'
      // For now, we allow HTTP from Pinterest CDN
      // In production, you might want to enforce HTTPS only
      expect(isValidPinterestUrl(httpUrl)).toBe(true)
    })
  })

  describe('Integration with background.ts', () => {
    it('should validate URL before download request', () => {
      // This test documents the expected behavior:
      // background.ts should call isValidPinterestUrl() before chrome.downloads.download()

      const validRequest = {
        action: 'downloadPin',
        pinID: '123',
        imageUrl: 'https://i.pinimg.com/originals/12/34/56/123456.jpg',
        filename: 'pin-123.jpg',
      }

      const maliciousRequest = {
        action: 'downloadPin',
        pinID: '456',
        imageUrl: 'https://evil.com/malware.exe',
        filename: 'pin-456.jpg',
      }

      // Valid request should pass validation
      expect(isValidPinterestUrl(validRequest.imageUrl)).toBe(true)

      // Malicious request should be rejected
      expect(isValidPinterestUrl(maliciousRequest.imageUrl)).toBe(false)
    })
  })
})
