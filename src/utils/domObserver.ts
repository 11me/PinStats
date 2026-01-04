/**
 * MutationObserver wrapper with debouncing for Pinterest pin detection
 */

export interface DomObserverOptions {
  selector: string
  debounceMs?: number
}

export type PinCallback = (elements: Element[]) => void

export function createDomObserver(
  options: DomObserverOptions,
  callback: PinCallback
): MutationObserver {
  const { selector, debounceMs = 200 } = options
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const processedElements = new WeakSet<Element>()

  const processElements = () => {
    const elements = document.querySelectorAll(selector)
    const newElements: Element[] = []

    elements.forEach((el) => {
      if (!processedElements.has(el)) {
        processedElements.add(el)
        newElements.push(el)
      }
    })

    if (newElements.length > 0) {
      callback(newElements)
    }
  }

  const observer = new MutationObserver(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(processElements, debounceMs)
  })

  return observer
}

export function startObserving(
  observer: MutationObserver,
  target: Node = document.body
): void {
  observer.observe(target, {
    childList: true,
    subtree: true,
  })
}

export function stopObserving(observer: MutationObserver): void {
  observer.disconnect()
}
