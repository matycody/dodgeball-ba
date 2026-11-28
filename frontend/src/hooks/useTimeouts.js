import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Tiempos muertos pedidos en el partido (equipo, tiempo y momento). Se vuelve a pedir cuando cambia el contador en vivo.
export function useTimeouts(matchId, used) {
  const [items, setItems] = useState([])
  const key = JSON.stringify(used ?? null)
  useEffect(() => {
    if (!matchId) return undefined
    let alive = true
    api('GET', '/matches/' + matchId + '/timeouts').then((r) => alive && setItems(r.items ?? [])).catch(() => {})
    return () => { alive = false }
  }, [matchId, key])
  return items
}
