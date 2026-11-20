import { useReveal } from '../hooks/useReveal'

// Aparece (sube y se aclara) cuando entra en pantalla al hacer scroll. delay en ms para escalonar varios.
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, shown] = useReveal()
  return (
    <Tag ref={ref} className={'reveal ' + (shown ? 'in ' : '') + className} style={{ '--d': delay + 'ms', ...style }} {...rest}>
      {children}
    </Tag>
  )
}
