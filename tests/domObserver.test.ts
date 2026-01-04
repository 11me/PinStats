import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDomObserver, startObserving, stopObserving } from '../src/utils/domObserver'

describe('domObserver', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    container.remove()
    vi.useRealTimers()
  })

  /**
   * Helper to flush MutationObserver callbacks in jsdom
   * MutationObserver uses microtasks, so we need to flush them
   */
  async function flushMutationObserver(): Promise<void> {
    await vi.runAllTimersAsync()
  }

  describe('createDomObserver', () => {
    it('should create a MutationObserver instance', () => {
      const callback = vi.fn()
      const observer = createDomObserver({ selector: '.test-pin' }, callback)

      expect(observer).toBeInstanceOf(MutationObserver)
    })

    it('should detect new elements matching selector', async () => {
      const callback = vi.fn()
      const observer = createDomObserver({ selector: '.test-pin', debounceMs: 50 }, callback)

      startObserving(observer, container)

      // Add a matching element
      const pin = document.createElement('div')
      pin.className = 'test-pin'
      container.appendChild(pin)

      // Flush microtasks and advance timers
      await flushMutationObserver()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith([pin])

      stopObserving(observer)
    })

    it('should debounce multiple rapid changes', async () => {
      const callback = vi.fn()
      const observer = createDomObserver({ selector: '.test-pin', debounceMs: 100 }, callback)

      startObserving(observer, container)

      // Add multiple elements rapidly
      const pins: HTMLElement[] = []
      for (let i = 0; i < 5; i++) {
        const pin = document.createElement('div')
        pin.className = 'test-pin'
        container.appendChild(pin)
        pins.push(pin)
      }

      // Flush microtasks and advance timers
      await flushMutationObserver()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback.mock.calls[0][0]).toHaveLength(5)

      stopObserving(observer)
    })

    it('should not call callback for already processed elements', async () => {
      const callback = vi.fn()
      const observer = createDomObserver({ selector: '.test-pin', debounceMs: 50 }, callback)

      startObserving(observer, container)

      // Add first element
      const pin1 = document.createElement('div')
      pin1.className = 'test-pin'
      container.appendChild(pin1)

      await flushMutationObserver()
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith([pin1])

      callback.mockClear()

      // Add second element (should only report the new one)
      const pin2 = document.createElement('div')
      pin2.className = 'test-pin'
      container.appendChild(pin2)

      await flushMutationObserver()
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith([pin2])

      stopObserving(observer)
    })
  })

  describe('stopObserving', () => {
    it('should stop detecting new elements', async () => {
      const callback = vi.fn()
      const observer = createDomObserver({ selector: '.test-pin', debounceMs: 50 }, callback)

      startObserving(observer, container)
      stopObserving(observer)

      // Add element after stopping
      const pin = document.createElement('div')
      pin.className = 'test-pin'
      container.appendChild(pin)

      await flushMutationObserver()

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
