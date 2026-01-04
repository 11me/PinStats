import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, isRetryableError } from '../../src/utils/retry'

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    expect(isRetryableError(new TypeError('Network failure'))).toBe(true)
    expect(isRetryableError(new Error('Failed to fetch'))).toBe(true)
    expect(isRetryableError(new Error('Network request failed'))).toBe(true)
  })

  it('should identify 5xx errors as retryable', () => {
    expect(isRetryableError({ ok: false, status: 500 })).toBe(true)
    expect(isRetryableError({ ok: false, status: 502 })).toBe(true)
    expect(isRetryableError({ ok: false, status: 503 })).toBe(true)
    expect(isRetryableError({ ok: false, status: 504 })).toBe(true)
    expect(isRetryableError({ ok: false, status: 599 })).toBe(true)
  })

  it('should identify 429 as retryable', () => {
    expect(isRetryableError({ ok: false, status: 429 })).toBe(true)
  })

  it('should NOT identify 4xx errors as retryable (except 429)', () => {
    expect(isRetryableError({ ok: false, status: 400 })).toBe(false)
    expect(isRetryableError({ ok: false, status: 401 })).toBe(false)
    expect(isRetryableError({ ok: false, status: 403 })).toBe(false)
    expect(isRetryableError({ ok: false, status: 404 })).toBe(false)
  })

  it('should NOT identify 2xx/3xx as retryable', () => {
    expect(isRetryableError({ ok: true, status: 200 })).toBe(false)
    expect(isRetryableError({ ok: true, status: 201 })).toBe(false)
    expect(isRetryableError({ ok: true, status: 301 })).toBe(false)
    expect(isRetryableError({ ok: true, status: 304 })).toBe(false)
  })

  it('should handle non-error objects gracefully', () => {
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
    expect(isRetryableError('string')).toBe(false)
    expect(isRetryableError(42)).toBe(false)
  })
})

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should succeed on first attempt without retry', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)
    const result = await promise

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
  })

  it('should retry 3 times on network failure with exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)

    // Wait for first failure
    await vi.runOnlyPendingTimersAsync()

    // Advance through first backoff (1s)
    await vi.advanceTimersByTimeAsync(1000)

    // Advance through second backoff (2s)
    await vi.advanceTimersByTimeAsync(2000)

    const result = await promise

    expect(fn).toHaveBeenCalledTimes(3)
    expect(result.ok).toBe(true)
  })

  it('should retry on 5xx server errors', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)

    // Advance through backoff (1s)
    await vi.advanceTimersByTimeAsync(1000)

    const result = await promise

    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)
  })

  it('should retry on 429 rate limiting', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)

    // Advance through backoff (1s)
    await vi.advanceTimersByTimeAsync(1000)

    const result = await promise

    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)
  })

  it('should NOT retry on 4xx client errors (except 429)', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const result = await retryWithBackoff(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(404)
  })

  it('should throw after 3 failed attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Network failure'))

    const promise = retryWithBackoff(fn)
    // Catch unhandled rejections to prevent test errors
    promise.catch(() => {})

    // Advance through all backoffs: 1s, 2s, 4s
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(promise).rejects.toThrow('Network failure')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should use exponential backoff: 1s, 2s, 4s', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    const promise = retryWithBackoff(fn)

    // First retry: 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000)

    // Second retry: 2000ms
    await vi.advanceTimersByTimeAsync(2000)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000)

    await promise
  })

  it('should respect custom maxRetries option', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Network failure'))

    const promise = retryWithBackoff(fn, { maxRetries: 5 })
    // Catch unhandled rejections to prevent test errors
    promise.catch(() => {})

    // Advance through all 5 attempts
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000 * Math.pow(2, i))
    }

    await expect(promise).rejects.toThrow('Network failure')
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it('should handle mixed success and failure responses', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)

    const result = await promise

    expect(fn).toHaveBeenCalledTimes(3)
    expect(result.status).toBe(200)
  })

  it('should return non-Response results without retry logic', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await retryWithBackoff(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result).toBe('success')
  })

  it('should handle Error with "fetch" in message as retryable', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const promise = retryWithBackoff(fn)

    await vi.advanceTimersByTimeAsync(1000)

    const result = await promise

    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.ok).toBe(true)
  })

  it('should not retry on non-retryable errors immediately', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid input'))

    await expect(retryWithBackoff(fn)).rejects.toThrow('Invalid input')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
