import { Check } from 'lucide-react'

// Indicador de pasos del registro: círculos con tilde en los hechos, el actual resaltado y líneas que se llenan al avanzar
export default function Stepper({ steps, current, title }) {
  return (
    <div className="mb-6" role="group" aria-label={'Paso ' + (current + 1) + ' de ' + steps.length}>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted">
        <span>{title}</span>
        <span>Paso {current + 1} de {steps.length}</span>
      </div>
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s} className={'flex items-center ' + (i < steps.length - 1 ? 'flex-1' : '')}>
            <div
              className={
                'step-dot grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ' +
                (i < current ? 'bg-accent text-black' : i === current ? 'border-2 border-accent bg-accent-soft text-accent' : 'border border-line text-muted')
              }
            >
              {i < current ? <Check size={15} strokeWidth={3} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <div className="step-line h-full bg-accent" style={{ width: i < current ? '100%' : '0%' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted">
        {steps.map((s, i) => <span key={s} className={i === current ? 'text-accent' : ''}>{s}</span>)}
      </div>
    </div>
  )
}
