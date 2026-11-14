import { useEffect, useRef, type PointerEvent } from 'react'

/** Paint pointer lighting without making React render on every mouse move. */
export function usePointerSurface() {
  const frame = useRef<number | null>(null)
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }, [])

  function resetSurface(event: PointerEvent<HTMLElement>): void {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    for (const property of ['--pointer-x', '--pointer-y', '--pointer-rx', '--pointer-ry']) {
      event.currentTarget.style.removeProperty(property)
    }
  }

  function moveSurface(event: PointerEvent<HTMLElement>): void {
    if (event.pointerType !== 'mouse' || document.documentElement.dataset.motion === 'off' ||
      document.documentElement.dataset.motion === 'reduced' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const element = event.currentTarget
    const bounds = (element.parentElement ?? element).getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty('--pointer-x', `${x * 100}%`)
      element.style.setProperty('--pointer-y', `${y * 100}%`)
      element.style.setProperty('--pointer-rx', `${(0.5 - y) * 4}deg`)
      element.style.setProperty('--pointer-ry', `${(x - 0.5) * 4}deg`)
      frame.current = null
    })
  }

  return { onPointerMove: moveSurface, onPointerLeave: resetSurface, onPointerCancel: resetSurface }
}
