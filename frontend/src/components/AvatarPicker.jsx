import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../lib/api'

const toSrc = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)

// Diseños de carita predeterminados para quien no quiere subir su foto
export default function AvatarPicker({ onPick, onClose, busy }) {
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setData(null)
    api('GET', '/me/photo/avatars?page=' + page).then(setData).catch((e) => setErr(e.message))
  }, [page])

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Elegí tu diseño</h2>
          <button aria-label="Cerrar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2"><X size={16} /></button>
        </div>
        {err && <p className="mb-3 text-sm font-bold text-danger">{err}</p>}
        <div className="grid grid-cols-4 gap-3">
          {(data?.items ?? Array.from({ length: 12 })).map((it, i) => (
            it ? (
              <button key={it.id} disabled={busy} onClick={() => onPick(it.id)} className="overflow-hidden rounded-full border border-line transition active:scale-95 disabled:opacity-50">
                <img src={toSrc(it.svg)} alt="" className="aspect-square w-full" />
              </button>
            ) : <div key={i} className="aspect-square rounded-full bg-surface-2" />
          ))}
        </div>
        <div className="mt-4 flex justify-between text-sm font-semibold">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-xl bg-surface-2 px-4 py-2 disabled:opacity-40">Anteriores</button>
          <button disabled={!data?.hasMore} onClick={() => setPage(page + 1)} className="rounded-xl bg-surface-2 px-4 py-2 disabled:opacity-40">Más diseños</button>
        </div>
      </div>
    </div>
  )
}
