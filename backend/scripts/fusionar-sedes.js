// Fusiona sedes duplicadas: los partidos de la sede "a borrar" pasan a la que se conserva, esta hereda lo que le falta
// (canchas, punto en el mapa, enlace, nota, foto) y la duplicada se elimina.
//   Simulación (no escribe nada):  node scripts/fusionar-sedes.js
//   Fusionar de verdad:            node scripts/fusionar-sedes.js --aplicar --produccion   (con backup previo)
// El nombre que queda es el de la sede que se conserva; se puede cambiar después desde Admin › Sedes › Editar.
require('dotenv').config()
const prisma = require('../src/db')

const aplicar = process.argv.includes('--aplicar')

// [sede a borrar, sede que se conserva]
const PARES = [
  ['Polideportivo N°8', 'Polideportivo N°8 San Fernando'],
  ['Club Social y Deportivo Morán', 'Club Morán'],
  ['Microestadio municipal Don Orione', 'Polideportivo Don Orione'],
]

const NOMBRE = (n) => String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')

async function main() {
  if (aplicar && (process.env.DATABASE_URL || '').includes('ep-withered-grass') && !process.argv.includes('--produccion')) {
    throw new Error('Esto apunta a PRODUCCIÓN. Hacé backup en Neon y volvé a correrlo con --produccion.')
  }
  const sedes = await prisma.venue.findMany({ where: { deletedAt: null } })
  const buscar = (n) => sedes.filter((s) => NOMBRE(s.name) === NOMBRE(n))
  for (const [borrar, conservar] of PARES) {
    const d = buscar(borrar), k = buscar(conservar)
    if (d.length !== 1 || k.length !== 1) {
      console.log('✖ ' + borrar + ' → ' + conservar + ': ' + (d.length !== 1 ? '"' + borrar + '" aparece ' + d.length + ' veces. ' : '') + (k.length !== 1 ? '"' + conservar + '" aparece ' + k.length + ' veces.' : ''))
      continue
    }
    const [dup, keep] = [d[0], k[0]]
    const partidos = await prisma.match.count({ where: { venueId: dup.id } })
    const herencia = {}
    for (const campo of ['latitude', 'longitude', 'mapUrl', 'notes', 'image']) if (keep[campo] == null && dup[campo] != null) herencia[campo] = dup[campo]
    if (dup.courts != null && (keep.courts == null || dup.courts > keep.courts)) herencia.courts = dup.courts
    console.log('✔ "' + dup.name + '" (' + partidos + ' partidos) → "' + keep.name + '"' + (Object.keys(herencia).length ? '  hereda: ' + Object.keys(herencia).join(', ') : ''))
    if (!aplicar) continue
    await prisma.$transaction([
      prisma.match.updateMany({ where: { venueId: dup.id }, data: { venueId: keep.id } }),
      prisma.venue.update({ where: { id: keep.id }, data: herencia }),
      prisma.venue.delete({ where: { id: dup.id } }),
    ])
  }
  console.log(aplicar ? 'Listo.' : 'Simulación: no se escribió nada. Para fusionar: --aplicar (--produccion en producción, con backup).')
}

main().catch((e) => { console.error(e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
