import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { api, apiUpload } from '../../lib/api'
import { BRANCH, MODALITY, FORMAT, CRITERIA } from '../../lib/format'
import { Btn, Alert, inputCls } from '../ui'
import LogoPicker from '../LogoPicker'
import { withSaving } from '../../lib/saving'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'

const NOW_YEAR = new Date().getFullYear()
const EMPTY = {
  name: '', year: NOW_YEAR, edition: '', branch: 'MIXED', modality: 'FOAM', format: 'LEAGUE', formatLabel: '',
  startsAt: '', endsAt: '', pointsWin: 3, pointsDraw: 1, pointsLoss: 0,
}
// Mediodía UTC para que la fecha no se corra por zona horaria
const toIso = (d) => (d ? d + 'T12:00:00.000Z' : undefined)

// Marca que se acaba de crear un torneo: si con "atrás" se vuelve a la pantalla de crear, se salta a la lista
export const CREATED_KEY = 'torneo-recien-creado'

function Field({ label, children }) {
  return <label className="block min-w-0 text-xs text-muted">{label}{children}</label>
}


// Datos del torneo: sirve para crear (t = null) y para editar dentro del torneo (pestaña Datos).
// Avisa si se intenta salir con cambios sin guardar. onDirty informa al padre para que avise también al cambiar de pestaña.
export default function TorneoForm({ t = null, onSaved, onDirty }) {
  const nav = useNavigate()
  const editId = t?.id ?? null
  const initial = t
    ? {
        name: t.name, year: t.year, edition: t.edition ?? '', branch: t.branch, modality: t.modality, format: t.format, formatLabel: t.formatLabel ?? '',
        startsAt: t.startsAt?.slice(0, 10) ?? '', endsAt: t.endsAt?.slice(0, 10) ?? '',
        pointsWin: t.pointsWin, pointsDraw: t.pointsDraw, pointsLoss: t.pointsLoss,
      }
    : EMPTY
  const initialTb = t ? t.tiebreakers.map((x) => x.criterion) : null
  const [form, setForm] = useState(initial)
  const [tb, setTb] = useState(initialTb) // null = desempates por defecto del backend
  const [logo, setLogo] = useState(null) // al crear: { file, url } pendiente de subir
  const [curLogo, setCurLogo] = useState(t?.logo ?? null) // al editar: URL actual
  const editDraft = t ? t.status === 'DRAFT' : true // el formato solo se cambia en borrador
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [base, setBase] = useState(JSON.stringify({ form: initial, tb: initialTb }))
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const dirty = !done && (JSON.stringify({ form, tb }) !== base || !!logo)
  useEffect(() => { onDirty?.(dirty) }, [dirty, onDirty])
  useEffect(() => () => onDirty?.(false), [onDirty])
  const { modal: leaveModal } = useLeaveGuard(dirty, '', {
    title: '¿Salir sin guardar?',
    message: editId ? 'Cambiaste datos del torneo y no los guardaste. Si salís, se pierden.' : 'Todavía no creaste el torneo. Si salís, se pierden los datos que cargaste.',
    stay: 'Quedarme',
    leave: 'Salir sin guardar',
  })

  function move(i, d) {
    setTb((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b })
  }
  const toggleCriterion = (c) => setTb((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))

  const pickLogo = (file) => setLogo((prev) => { if (prev) URL.revokeObjectURL(prev.url); return { file, url: URL.createObjectURL(file) } })
  const clearPending = () => setLogo((prev) => { if (prev) URL.revokeObjectURL(prev.url); return null })
  // Editando: la imagen se sube o se quita en el momento
  async function uploadLogo(file) {
    setBusy(true); setErr('')
    try { const r = await apiUpload('/photos/tournaments/' + editId, file); setCurLogo(r.logo); await onSaved?.() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function removeLogo() {
    setBusy(true); setErr('')
    try { await api('DELETE', '/photos/tournaments/' + editId); setCurLogo(null); await onSaved?.() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      if (editId) {
        const body = {
          name: form.name.trim(), edition: form.edition.trim() || null, formatLabel: form.formatLabel.trim() || null,
          startsAt: toIso(form.startsAt) ?? null, endsAt: toIso(form.endsAt) ?? null,
          pointsWin: Number(form.pointsWin), pointsDraw: Number(form.pointsDraw), pointsLoss: Number(form.pointsLoss),
          ...(tb ? { tiebreakers: tb } : {}),
          year: Number(form.year), branch: form.branch, modality: form.modality,
          ...(editDraft ? { format: form.format } : {}),
        }
        await withSaving({ title: 'Guardando el torneo', doneTitle: 'Torneo guardado' }, async () => { await api('PATCH', '/tournaments/' + editId, body); await onSaved?.() })
        setBase(JSON.stringify({ form, tb }))
      } else {
        const body = {
          name: form.name.trim(), year: Number(form.year), edition: form.edition.trim() || undefined, formatLabel: form.formatLabel.trim() || undefined,
          branch: form.branch, modality: form.modality, format: form.format,
          startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt),
          pointsWin: Number(form.pointsWin), pointsDraw: Number(form.pointsDraw), pointsLoss: Number(form.pointsLoss),
          ...(tb ? { tiebreakers: tb } : {}),
        }
        const t = await withSaving({ title: 'Creando el torneo', doneTitle: 'Torneo creado', steps: ['Guardando los datos', 'Preparando etapas y reglas', 'Subiendo el escudo'] }, async () => {
          const nt = await api('POST', '/tournaments', body)
          if (logo) { try { await apiUpload('/photos/tournaments/' + nt.id, logo.file) } catch { /* se puede subir después desde Editar */ } }
          return nt
        })
        setDone(true) // ya está guardado: no avisar al salir
        clearPending()
        try { sessionStorage.setItem(CREATED_KEY, '1') } catch { /* sin storage */ }
        nav('/admin/torneos/' + t.id + '?tab=equipos', { replace: true }) // reemplaza la pantalla de crear: "atrás" vuelve a la lista
      }
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <>
      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      <form onSubmit={save} className="space-y-3 rounded-3xl border border-line bg-surface p-5">
        {editId && !editDraft && <p className="text-xs text-muted">El torneo ya está en curso: el formato no se puede cambiar.</p>}
        <input className={inputCls} placeholder="Nombre" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        {editId
          ? <LogoPicker name={form.name} src={curLogo} onPick={uploadLogo} onClear={removeLogo} onError={setErr} disabled={busy} label="Imagen del torneo" />
          : <LogoPicker name={form.name} src={logo?.url} onPick={pickLogo} onClear={clearPending} onError={setErr} disabled={busy} label="Imagen del torneo (opcional)" />}
        <>
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
              <Field label="Año"><input type="number" className={inputCls} required value={form.year} onChange={(e) => set('year', e.target.value)} /></Field>
              <Field label="Edición (opcional)"><input className={inputCls} placeholder="Apertura, 2.ª…" value={form.edition} onChange={(e) => set('edition', e.target.value)} /></Field>
              <Field label="Rama">
                <select className={inputCls} value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                  {Object.entries(BRANCH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Modalidad">
                <select className={inputCls} value={form.modality} onChange={(e) => set('modality', e.target.value)}>
                  {Object.entries(MODALITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Formato">
              <select disabled={!editDraft} className={inputCls} value={form.format} onChange={(e) => set('format', e.target.value)}>
                {Object.entries(FORMAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Nombre del formato (opcional)">
              <input className={inputCls} maxLength={40} placeholder={'Ej.: Todos contra todos + Final (si no, se llama «' + FORMAT[form.format] + '»)'} value={form.formatLabel} onChange={(e) => set('formatLabel', e.target.value)} />
            </Field>
        </>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <Field label="Inicio"><input type="date" className={inputCls} value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
          <Field label="Fin"><input type="date" className={inputCls} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
        </div>
        <>
            <div className="grid grid-cols-3 gap-3 [&>*]:min-w-0">
              <Field label="Pts victoria"><input type="number" min="0" className={inputCls} value={form.pointsWin} onChange={(e) => set('pointsWin', e.target.value)} /></Field>
              <Field label="Pts empate"><input type="number" min="0" className={inputCls} value={form.pointsDraw} onChange={(e) => set('pointsDraw', e.target.value)} /></Field>
              <Field label="Pts derrota"><input type="number" min="0" className={inputCls} value={form.pointsLoss} onChange={(e) => set('pointsLoss', e.target.value)} /></Field>
            </div>
            <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={tb !== null} onChange={(e) => setTb(e.target.checked ? ['HEAD_TO_HEAD', 'SET_DIFFERENCE', 'SETS_WON', 'DRAW_LOT'] : null)} />
                Personalizar criterios de desempate
              </label>
              {tb && (
                <div className="space-y-1">
                  <p className="text-xs text-muted">Se aplican en este orden cuando hay igualdad de puntos.</p>
                  {tb.map((c, i) => (
                    <div key={c} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
                      <span className="w-5 font-bold text-muted">{i + 1}</span>
                      <span className="flex-1">{CRITERIA[c]}</span>
                      <button type="button" aria-label="Subir" onClick={() => move(i, -1)}><ChevronUp size={18} /></button>
                      <button type="button" aria-label="Bajar" onClick={() => move(i, 1)}><ChevronDown size={18} /></button>
                      <button type="button" aria-label="Quitar" onClick={() => toggleCriterion(c)}><Trash2 size={16} className="text-danger" /></button>
                    </div>
                  ))}
                  {Object.keys(CRITERIA).filter((c) => !tb.includes(c)).map((c) => (
                    <button key={c} type="button" onClick={() => toggleCriterion(c)} className="mr-2 rounded-full border border-line px-3 py-1 text-xs">+ {CRITERIA[c]}</button>
                  ))}
                </div>
              )}
            </div>
        </>
        {dirty && <p className="text-xs font-bold text-warn">Tenés cambios sin guardar.</p>}
        <Btn type="submit" tone="accent" disabled={busy || (editId && !dirty)} className="w-full">{editId ? 'Guardar cambios' : 'Crear torneo'}</Btn>
      </form>
      {leaveModal}
    </>
  )
}
