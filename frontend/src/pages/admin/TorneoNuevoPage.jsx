import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import BackLink from '../../components/BackLink'
import TorneoForm, { CREATED_KEY } from '../../components/admin/TorneoForm'
import { TABS } from './TorneoAdminPage'

// Crear torneo: mismo menú que un torneo ya creado (Datos, Equipos, Estructura, Fixture…).
// Hasta guardar los datos solo se puede usar "Datos"; las demás pestañas se habilitan al crear.
export default function TorneoNuevoPage() {
  const [hint, setHint] = useState(false)
  const nav = useNavigate()
  // Si recién se creó un torneo y con "atrás" se llegó acá, no se muestra el formulario vacío: se sigue hacia la lista
  const [skip] = useState(() => { try { return sessionStorage.getItem(CREATED_KEY) === '1' } catch { return false } })
  useEffect(() => {
    if (!skip) return
    if (window.history.state?.idx > 0) nav(-1)
    else nav('/admin/torneos', { replace: true })
  }, [skip, nav])
  if (skip) return null

  return (
    <div className="space-y-4">
      <BackLink to="/admin/torneos" className="flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} /> Torneos</BackLink>
      <div>
        <h1 className="text-xl font-extrabold">Crear torneo</h1>
        <p className="text-sm text-muted">Empezá por los datos. Al crearlo se habilitan los equipos, la estructura, el fixture y el resto, todo en este mismo menú.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([k, label]) => (k === 'datos' ? (
          <button key={k} type="button" className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-black">{label}</button>
        ) : (
          <button
            key={k}
            type="button"
            aria-disabled="true"
            onClick={() => setHint(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-muted opacity-60"
          >
            <Lock size={12} /> {label}
          </button>
        )))}
      </div>
      {hint && <p role="status" className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">Primero tocá <b className="text-fg">Crear torneo</b> abajo: después se habilita esta pestaña.</p>}
      <TorneoForm />
    </div>
  )
}
