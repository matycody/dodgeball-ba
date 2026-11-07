import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bug, ImagePlus, X, CheckCircle2, AlertTriangle, LayoutTemplate, Lightbulb, MessageSquare, ShieldCheck } from 'lucide-react'
import { api, apiUploadReportImage } from '../lib/api'
import { getReportContext } from '../lib/reportContext'
import { useAuthStore } from '../stores/authStore'
import { Btn, Alert, inputCls } from '../components/ui'

const KINDS = [
  ['ERROR', 'Algo no funciona', 'Un error o algo que no responde', AlertTriangle],
  ['VISUAL', 'Se ve mal', 'Texto cortado, colores o pantalla desordenada', LayoutTemplate],
  ['SUGGESTION', 'Sugerencia', 'Una idea para mejorar la app', Lightbulb],
  ['OTHER', 'Otra cosa', 'Cualquier otro comentario', MessageSquare],
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
        <CheckCircle2 size={44} className="mx-auto text-live" />
        <p className="text-xl font-extrabold">¡Gracias! Recibimos tu reporte</p>
        <p className="text-sm text-muted">La organización lo va a revisar.{done.failed ? ' No pudimos subir ' + done.failed + ' captura(s); si podés, mandá otro reporte con la imagen.' : ''}</p>
        <Link to="/" className="inline-block rounded-2xl border border-line bg-surface-2 px-5 py-3 text-sm font-extrabold">Volver al inicio</Link>
      </div>
    )
  }

  const ready = message.trim().length >= 5

  return (
    <form onSubmit={send} className="space-y-5 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Bug size={22} /></div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight">Reportar un problema</h1>
          <p className="mt-1 text-sm text-muted">Tu aviso llega directo a la organización y nos ayuda a mejorar la app.</p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">¿Qué tipo de problema es?</legend>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map(([k, l, hint, Icon]) => {
            const on = kind === k
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setKind(k)} className={'flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ' + (on ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2')}>
                <Icon size={20} className={on ? 'text-accent' : 'text-muted'} />
                <span className="text-sm font-extrabold">{l}</span>
                <span className="text-xs leading-snug text-muted">{hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="rep-msg" className="block text-sm font-bold">Contanos qué pasó</label>
        <textarea id="rep-msg" className={inputCls + ' min-h-36 text-sm text-fg'} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Qué estabas haciendo, qué esperabas que pasara y qué pasó en cambio." />
        <p className="text-right text-xs text-muted">{message.length} / 2000</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">Capturas <span className="font-normal text-muted">(opcional, hasta {MAX_IMAGES})</span></p>
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={f.url} className="relative aspect-square overflow-hidden rounded-2xl border border-line">
                <img src={f.url} alt={'Captura ' + (i + 1)} className="h-full w-full object-cover" />
                <button type="button" aria-label="Quitar captura" onClick={() => setFiles((c) => c.filter((x) => x !== f))} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {files.length < MAX_IMAGES && (
          <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-4 text-sm font-bold text-muted">
            <ImagePlus size={20} /> {files.length ? 'Agregar otra captura' : 'Adjuntar captura de pantalla'}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick} />
      </div>

      {!user && (
        <div className="space-y-1.5">
          <label htmlFor="rep-mail" className="block text-sm font-bold">Tu mail <span className="font-normal text-muted">(opcional)</span></label>
          <input id="rep-mail" type="email" className={inputCls + ' text-sm text-fg'} maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@mail.com" />
          <p className="text-xs text-muted">Solo lo usamos si necesitamos preguntarte algo sobre el reporte.</p>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface-2 p-3 text-xs text-muted">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-live" />
        <p>Con el reporte enviamos solos la pantalla en la que estabas, el tipo de dispositivo y los últimos errores técnicos. No se envía tu contraseña ni datos privados.</p>
      </div>

      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      <Btn type="submit" tone="accent" disabled={busy || !ready} className="w-full">{busy ? 'Enviando…' : 'Enviar reporte'}</Btn>
    </form>
  )
}
