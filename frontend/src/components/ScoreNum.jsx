import { useEffect, useRef, useState } from 'react'

// Número de marcador que hace un "pop" cuando cambia (llega por socket). Sin estado de React por tick: solo cuando el valor cambia de verdad.
export default function ScoreNum({ value, className = '' }) {
  const prev = useRef(value)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (prev.current !== value) { prev.current = value; setBump((b) => b + 1) }
  }, [value])
  return <span key={bump} className={className + (bump ? ' m-score' : '')}>{value}</span>
}
