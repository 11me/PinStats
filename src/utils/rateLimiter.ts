/**
 * Rate limiter for Pinterest API calls
 * Prevents 429 responses by limiting request frequency
 */

interface QueueItem {
  pinID: string
  resolve: (value: void) => void
}

const MAX_REQUESTS_PER_SECOND = 3
const BACKOFF_BASE_MS = 1000
const MAX_BACKOFF_MS = 30000

let queue: QueueItem[] = []
let isProcessing = false
let backoffMultiplier = 1
let lastRequestTime = 0

/**
 * Add a pin ID to the fetch queue
 * Returns a promise that resolves when the pin is ready to be fetched
 */
export function enqueue(pinID: string): Promise<void> {
  return new Promise((resolve) => {
    // Skip if already in queue
    if (queue.some((item) => item.pinID === pinID)) {
      resolve()
      return
    }

    queue.push({ pinID, resolve })
    processQueue()
  })
}

/**
 * Get the next batch of pin IDs to fetch
 * Respects rate limiting
 */
export function dequeue(): string[] {
  const batch = queue.splice(0, MAX_REQUESTS_PER_SECOND)
  batch.forEach((item) => item.resolve())
  return batch.map((item) => item.pinID)
}

/**
 * Process the queue with rate limiting
 */
async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) return

  isProcessing = true

  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  const minInterval = (1000 / MAX_REQUESTS_PER_SECOND) * backoffMultiplier

  if (timeSinceLastRequest < minInterval) {
    await sleep(minInterval - timeSinceLastRequest)
  }

  lastRequestTime = Date.now()
  isProcessing = false

  // Resolve next item
  const item = queue.shift()
  if (item) {
    item.resolve()
  }

  // Continue processing if more items
  if (queue.length > 0) {
    processQueue()
  }
}

/**
 * Called when we receive a 429 response
 * Increases backoff multiplier
 */
export function handleRateLimit(): void {
  backoffMultiplier = Math.min(backoffMultiplier * 2, MAX_BACKOFF_MS / BACKOFF_BASE_MS)
  console.log(`[PinStats] Rate limited, backoff multiplier: ${backoffMultiplier}`)
}

/**
 * Called on successful request
 * Gradually decreases backoff
 */
export function handleSuccess(): void {
  backoffMultiplier = Math.max(1, backoffMultiplier * 0.9)
}

/**
 * Get current queue length
 */
export function getQueueLength(): number {
  return queue.length
}

/**
 * Clear the queue
 */
export function clearQueue(): void {
  queue.forEach((item) => item.resolve())
  queue = []
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
