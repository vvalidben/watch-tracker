import { useLayoutEffect, useRef } from 'react'

let observer: IntersectionObserver | undefined

/** One shared observer reveals covers as they arrive in the scroll viewport. */
export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    if (document.documentElement.dataset.motion === 'off' || document.documentElement.dataset.motion === 'reduced' ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const node = entry.target as HTMLElement
        node.dataset.reveal = 'shown'
        observer?.unobserve(entry.target)
      }
    }, { threshold: .06, rootMargin: '0px 0px 30px 0px' })
    node.dataset.reveal = 'pending'
    observer.observe(node)
    return () => { observer?.unobserve(node) }
  }, [])
  return ref
}
