import { CheckCircle2 } from 'lucide-react'
import { useSaving } from '../lib/saving'

// Pantalla completa oscurecida mientras se guarda algo pesado. Usa los colores del tema (claro, oscuro, azul).
export default function SavingOverlay() {
  const { open, title, sub, steps, step, done } = useSaving()
  if (!open) return null
  const pct = done ? 100 : steps.length ? Math.round((step / steps.length) * 100) : 0
  return (
    <div role="alertdialog" aria-modal="true" aria-live="polite" aria-busy={!done} aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-xs rounded-3xl border border-line bg-surface p-6 text-center text-fg shadow-2xl">
        {done ? (
          <CheckCircle2 size={52} className="mx-auto mb-4 text-live" />
        ) : (
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-line border-t-accent motion-reduce:animate-none" />
        )}
        <p className="text-lg font-extrabold leading-tight">{title}</p>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
          {steps.length > 0 || done
            ? <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: pct + '%' }} />
            : <div className="h-full w-1/3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />}
        </div>
        {steps.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-left text-sm">
            {steps.map((s, i) => {
              const state = done || i < step ? 'done' : i === step ? 'on' : 'todo'
              return (
                <li key={s} className={'flex items-center gap-2 ' + (state === 'done' ? 'text-live' : state === 'on' ? 'text-fg' : 'text-muted')}>
                  {state === 'done' ? <CheckCircle2 size={16} className="shrink-0" />
                    : state === 'on' ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
                    : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-line" />}
                  {s}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
