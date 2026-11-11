// Regla de contraseña para cuentas nuevas: empieza con mayúscula, lleva letras y al menos un número.
// Los símbolos están permitidos pero no son obligatorios. (Las cuentas ya creadas no se tocan: el login no valida nada.)
export const PASSWORD_HINT = 'Mínimo 6 caracteres, empieza con mayúscula y lleva letras y al menos un número. Los símbolos son opcionales.'

export function passwordError(p) {
  if (!/^[A-Z]/.test(p)) return 'La contraseña tiene que empezar con una letra mayúscula'
  if (!/[0-9]/.test(p)) return 'La contraseña tiene que tener al menos un número'
  if (!/[a-zA-Z]/.test(p.slice(1))) return 'La contraseña tiene que tener letras además de la inicial'
  if (p.length < 6) return 'La contraseña tiene que tener al menos 6 caracteres'
  return ''
}
