import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Devuelve [ref, visible]: visible pasa a true una sola vez, cuando el elemento entra en pantalla (sin IntersectionObserver, ya es visible)
export function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return undefined
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [shown])
  return [ref, shown]
}

// Cuenta de 0 hasta target cuando start pasa a true (con "reducir movimiento" muestra el número final de una)
export function useCountUp(target, start, ms = 1610) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start || target == null) return undefined
    if (reduced()) { setV(target); return undefined }
    let raf
    let t0
    const tick = (t) => {
      t0 ??= t
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3)))) // desacelera al final
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, start, ms])
  return start ? v : 0
}
