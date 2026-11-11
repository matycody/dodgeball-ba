import { useLayoutEffect, useRef } from 'react'

// Animación de reordenamiento (FLIP) sin librerías: los elementos con data-flip="clave" que cambian de lugar entre un render y el siguiente
// se deslizan desde su posición anterior, con un destello verde si subieron y rojo si bajaron. Se usa en las tablas de posiciones.
export function useFlip() {
  const ref = useRef(null)
  const prev = useRef(new Map())
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const next = new Map()
    root.querySelectorAll('[data-flip]').forEach((el) => {
      const k = el.getAttribute('data-flip')
      const y = el.offsetTop // relativo a la tabla: no cambia al hacer scroll
      next.set(k, y)
      const was = prev.current.get(k)
      if (was == null || reduce || Math.abs(was - y) < 2 || !el.animate) return
      el.animate([{ transform: 'translateY(' + (was - y) + 'px)' }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' })
      const bg = getComputedStyle(el).backgroundColor
      el.animate([{ backgroundColor: was > y ? 'rgba(62,207,142,.30)' : 'rgba(255,107,107,.28)' }, { backgroundColor: bg }], { duration: 1400, easing: 'ease-out' })
    })
    prev.current = next
  })
  return ref
}
