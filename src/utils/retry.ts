/**
 * Retry utility with exponential backoff
 * Handles network failures, 5xx errors, and rate limiting
 */

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000 // 1s
const DEFAULT_TIMEOUT_MS = 10000 // 10s

export interface RetryOptions {
  maxRetries?: number
  timeout?: number
}

export interface RetryableResponse {
  ok: boolean
  status: number
}

/**
 * Determines if an error or response should trigger a retry.
 *
 * Retryable conditions:
 * - Network failures (TypeError, fetch errors)
 * - 5xx server errors (500-599)
 * - 429 rate limiting
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('fetch') || message.includes('network')
  }

  // HTTP errors - check if it's a Response-like object
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const response = error as RetryableResponse

    // Don't retry on successful responses
    if (response.ok) {
      return false
    }

    // Retry on 429 (rate limiting)
    if (response.status === 429) {
      return true
    }

    // Retry on 5xx server errors
    if (response.status >= 500 && response.status < 600) {
      return true
    }

    // Don't retry on other 4xx client errors
    return false
  }

  return false
}

/**
 * Wraps a fetch operation with exponential backoff retry logic.
 *
 * @param fn - Async function to execute (usually a fetch call)
 * @param options - Retry configuration
 * @returns Promise resolving to the successful response
 * @throws Error after max retries exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS

  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn()

      // Check if response indicates retryable error
      if (typeof result === 'object' && result !== null && 'ok' in result && 'status' in result) {
        const response = result as RetryableResponse
        if (!response.ok && isRetryableError(response)) {
          throw response // Treat as error to trigger retry
        }
      }

      return result
    } catch (error) {
      lastError = error

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error
      }

      // Don't retry if max attempts reached
      if (attempt === maxRetries - 1) {
        break
      }

      // Calculate exponential backoff: 1s, 2s, 4s
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
      console.warn(
        `[PinStats] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms`,
        error
      )

      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  throw lastError
}
