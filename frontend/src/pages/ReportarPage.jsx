import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bug, ImagePlus, X, CheckCircle2 } from 'lucide-react'
import { api, apiUploadReportImage } from '../lib/api'
import { getReportContext } from '../lib/reportContext'
import { useAuthStore } from '../stores/authStore'
import { Btn, Alert, inputCls } from '../components/ui'

const KINDS = [
  ['ERROR', 'Algo no funciona'],
  ['VISUAL', 'Se ve mal'],
  ['SUGGESTION', 'Sugerencia'],
  ['OTHER', 'Otra cosa'],
]
const MAX_IMAGES = 3

// Reduce la captura antes de subirla (ahorra datos en el celular). Si no se puede, va la original.
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? new File([blob], 'captura.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

// Cualquier persona (con o sin cuenta) cuenta qué pasó; solo lo lee la organización
export default function ReportarPage() {
  const user = useAuthStore((s) => s.user)
  const [kind, setKind] = useState('ERROR')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState([]) // [{ file, url }]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null) // { failed: n }
  const input = useRef(null)

  async function pick(e) {
    const list = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    const room = MAX_IMAGES - files.length
    const small = await Promise.all(list.slice(0, room).map(shrink))
    setFiles((cur) => [...cur, ...small.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  async function send(e) {
    e.preventDefault()
    if (message.trim().length < 5) { setErr('Contanos qué pasó (al menos unas palabras).'); return }
    setBusy(true); setErr('')
    try {
      const ctx = getReportContext()
      const r = await api('POST', '/reports', { kind, message, contactEmail: user ? undefined : email || undefined, ...ctx })
      let failed = 0
      for (const f of files) {
        try { await apiUploadReportImage(r.id, r.uploadKey, f.file) } catch { failed++ }
      }
      setDone({ failed })
    } catch (er) {
      setErr(er.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-3xl border border-line bg-surface p-6 text-center">
        <CheckCircle2 size={40} className="mx-auto text-live" />
        <p className="text-lg font-extrabold">¡Gracias! Recibimos tu reporte</p>
        <p className="text-sm text-muted">La organización lo va a revisar.{done.failed ? ' No pudimos subir ' + done.failed + ' captura(s); si podés, mandá otro reporte con la imagen.' : ''}</p>
        <Link to="/" className="inline-block rounded-2xl border border-line bg-surface-2 px-5 py-3 text-sm font-extrabold">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div className="flex items-center gap-3">
        <Bug size={22} className="text-accent" />
        <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Reportar un problema</h1>
      </div>
      <p className="text-sm text-muted">Si algo falla, se ve raro o se te ocurre una mejora, contanos. Sumamos solos la pantalla en la que estabas y tu dispositivo.</p>

      <div className="flex flex-wrap gap-2">
        {KINDS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={'rounded-full border px-4 py-2 text-sm font-bold ' + (kind === k ? 'border-accent bg-accent text-black' : 'border-line bg-surface text-fg')}>{l}</button>
        ))}
      </div>

      <label className="block text-xs text-muted">¿Qué pasó?
        <textarea className={inputCls + ' mt-1 min-h-32 text-sm text-fg'} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ej.: toqué el partido de Panthers y la pantalla quedó en blanco" />
        <span className="mt-1 block text-right">{message.length}/2000</span>
      </label>

      <div className="space-y-2">
        <p className="text-xs text-muted">Capturas (opcional, hasta {MAX_IMAGES})</p>
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-line">
              <img src={f.url} alt={'Captura ' + (i + 1)} className="h-full w-full object-cover" />
              <button type="button" aria-label="Quitar captura" onClick={() => setFiles((c) => c.filter((x) => x !== f))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"><X size={14} /></button>
            </div>
          ))}
          {files.length < MAX_IMAGES && (
            <button type="button" onClick={() => input.current?.click()} className="grid h-24 w-24 place-items-center rounded-2xl border border-dashed border-line bg-surface text-muted"><ImagePlus size={24} /></button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick} />
      </div>

      {!user && (
        <label className="block text-xs text-muted">Tu mail (opcional, por si necesitamos preguntarte algo)
          <input type="email" className={inputCls + ' mt-1 text-sm text-fg'} maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@mail.com" />
        </label>
      )}

      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      <Btn type="submit" tone="accent" disabled={busy} className="w-full">{busy ? 'Enviando…' : 'Enviar reporte'}</Btn>
    </form>
  )
}
