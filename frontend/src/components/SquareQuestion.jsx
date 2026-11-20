// Cuadrado con signo de interrogación (propio: los nombres de íconos de lucide cambian entre versiones)
export default function SquareQuestion({ size = 24, className, ...rest }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 2.5" />
      <path d="M12 17h.01" />
    </svg>
  )
}
