// Quita el fondo claro pintado de los escudos YA cargados (equipos, ramas y torneos) para que se vean uniformes sobre el tema.
//   Simulación (no escribe nada):  node scripts/limpiar-fondos-escudos.js
//   Aplicar:                       node scripts/limpiar-fondos-escudos.js --aplicar --produccion   (con backup previo)
// Los escudos nuevos ya se limpian solos al subirlos. Solo toca escudos que tienen fondo claro; los demás quedan igual.
require('dotenv').config();
const sharp = require('sharp');
const prisma = require('../src/db');
const storage = require('../src/services/storage');
const { removeLightBackground } = require('../src/services/logoBg');

const APLICAR = process.argv.includes('--aplicar');

async function procesar(nombre, url, path, guardar) {
  if (!url) return 0;
  try {
    const res = await fetch(url.split('?')[0]);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const { changed } = await removeLightBackground(await sharp(buf).png().toBuffer());
    if (!changed) return 0;
    console.log((APLICAR ? 'Limpio: ' : 'Tiene fondo claro: ') + nombre);
    if (APLICAR) {
      const webp = await storage.processImage(buf, 'logo');
      const nueva = await storage.uploadLogo(path, webp);
      await guardar(nueva);
    }
    return 1;
  } catch (e) {
    console.log('  (se saltea ' + nombre + ': ' + e.message + ')');
    return 0;
  }
}

(async () => {
  const url = process.env.DATABASE_URL || '';
  if (APLICAR && url.includes('ep-withered-grass') && !process.argv.includes('--produccion')) {
    throw new Error('Esto apunta a PRODUCCIÓN. Hacé backup en Neon y volvé a correrlo con --produccion.');
  }
  let n = 0;
  for (const t of await prisma.team.findMany({ where: { logo: { not: null } }, select: { id: true, name: true, logo: true } })) {
    n += await procesar('equipo ' + t.name, t.logo, 'teams/' + t.id + '.webp', (u) => prisma.team.update({ where: { id: t.id }, data: { logo: u } }));
  }
  for (const b of await prisma.teamBranch.findMany({ where: { logo: { not: null } }, include: { team: { select: { name: true } } } })) {
    n += await procesar('equipo ' + b.team.name + ' (' + b.branch + ')', b.logo, 'teams/' + b.teamId + '-' + b.branch + '.webp',
      (u) => prisma.teamBranch.update({ where: { teamId_branch: { teamId: b.teamId, branch: b.branch } }, data: { logo: u } }));
  }
  for (const t of await prisma.tournament.findMany({ where: { logo: { not: null } }, select: { id: true, name: true, logo: true } })) {
    n += await procesar('torneo ' + t.name, t.logo, 'tournaments/' + t.id + '.webp', (u) => prisma.tournament.update({ where: { id: t.id }, data: { logo: u } }));
  }
  console.log(APLICAR ? 'Listo: ' + n + ' escudos limpiados.' : n + ' escudos tienen fondo claro. Para limpiarlos: --aplicar (--produccion en producción, con backup).');
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
