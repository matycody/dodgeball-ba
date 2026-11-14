import { Check } from 'lucide-react'

// Indicador de pasos del registro: círculos con tilde en los hechos, el actual resaltado y líneas que se llenan al avanzar
export default function Stepper({ steps, current, title }) {
  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface-2 p-4 shadow-lg" role="group" aria-label={'Paso ' + (current + 1) + ' de ' + steps.length}>
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-fg">
        <span>{title}</span>
        <span>Paso {current + 1} de {steps.length}</span>
      </div>
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s} className={'flex items-center ' + (i < steps.length - 1 ? 'flex-1' : '')}>
            <div
              className={
                'step-dot grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ' +
                (i < current ? 'bg-accent text-black' : i === current ? 'border-2 border-accent bg-accent-soft text-accent' : 'border-2 border-line bg-surface text-muted')
              }
            >
              {i < current ? <Check size={15} strokeWidth={3} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="mx-1.5 h-1 flex-1 overflow-hidden rounded-full bg-line">
                <div className="step-line h-full bg-accent" style={{ width: i < current ? '100%' : '0%' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-muted">
        {steps.map((s, i) => <span key={s} className={i === current ? 'text-accent' : ''}>{s}</span>)}
      </div>
    </div>
  )
}
