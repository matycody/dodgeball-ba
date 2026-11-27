import { ArrowLeft } from 'lucide-react'
import BackLink from '../../components/BackLink'
import TorneoForm from '../../components/admin/TorneoForm'

// Crear torneo: se cargan los datos y al guardar se pasa directo al torneo para armar equipos, estructura y fixture
export default function TorneoNuevoPage() {
  return (
    <div className="space-y-4">
      <BackLink to="/admin/torneos" className="flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} /> Torneos</BackLink>
      <div>
        <h1 className="text-xl font-extrabold">Crear torneo</h1>
        <p className="text-sm text-muted">Cargá los datos básicos. Al crearlo, seguís con los equipos, la estructura y el fixture en el mismo lugar.</p>
      </div>
      <TorneoForm />
    </div>
  )
}
