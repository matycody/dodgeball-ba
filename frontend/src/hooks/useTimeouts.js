import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Tiempos muertos pedidos en el partido (equipo, tiempo y momento). Se vuelve a pedir cuando cambia el contador en vivo.
export function useTimeouts(matchId, used) {
  const [items, setItems] = useState([])
  const key = JSON.stringify(used ?? null)
  useEffect(() => {
    if (!matchId) return undefined
    let alive = true
    const load = () => api('GET', '/matches/' + matchId + '/timeouts').then((r) => alive && setItems(r.items ?? [])).catch(() => {})
    // el contador en vivo cambia antes de que el servidor termine de guardar el pedido o el deshacer: se vuelve a leer apenas después
    load()
    const t = setTimeout(load, 900)
    return () => { alive = false; clearTimeout(t) }
  }, [matchId, key])
  return items
}
