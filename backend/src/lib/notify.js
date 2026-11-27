// Avisos dentro de la web (campana). Nunca rompen la acción que los origina: cualquier error se registra y se sigue.
// Si la tabla todavía no existe (falta migrar) o el cliente de Prisma no se regeneró, simplemente no hacen nada.
const prisma = require('../db');

let ioRef = null;
const setIo = (io) => { ioRef = io; };

const TZ = 'America/Argentina/Buenos_Aires';
const fmtDate = (d) => (d
  ? new Date(d).toLocaleString('es-AR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'a definir');

const serialize = (n) => ({
  id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt,
});

// Crea el aviso para cada cuenta y lo empuja en vivo a quien esté conectado. key evita repetirlo.
async function notify(userIds, { type, title, body = null, link = null, key = null }) {
  try {
    if (!prisma.notification) return;
    const ids = [...new Set((userIds ?? []).filter(Boolean))].slice(0, 300);
    for (const userId of ids) {
      try {
        const n = await prisma.notification.create({
          data: { userId, type, title: title.slice(0, 120), body: body ? String(body).slice(0, 300) : null, link, dedupeKey: key },
        });
        if (ioRef) ioRef.to('user:' + userId).emit('notif:new', serialize(n));
      } catch (e) {
        if (e.code !== 'P2002') console.error('[notify]', e.message); // P2002 = ya se avisó (mismo dedupeKey)
      }
    }
  } catch (e) {
    console.error('[notify]', e.message);
  }
}

// ── Destinatarios ──
async function usersOfProfiles(profileIds) {
  const ids = [...new Set((profileIds ?? []).filter(Boolean))];
  if (!ids.length) return [];
  const users = await prisma.user.findMany({ where: { profileId: { in: ids }, active: true }, select: { id: true } });
  return users.map((u) => u.id);
}
async function adminUserIds() {
  const users = await prisma.user.findMany({ where: { roles: { has: 'ADMIN' }, active: true }, select: { id: true } });
  return users.map((u) => u.id);
}
async function playersOfTeams(teamIds) {
  const ids = [...new Set((teamIds ?? []).filter(Boolean))];
  if (!ids.length) return [];
  const rows = await prisma.playerTeam.findMany({ where: { teamId: { in: ids }, to: null }, select: { profileId: true } });
  return usersOfProfiles(rows.map((r) => r.profileId));
}
// Árbitros y mesa asignados a un partido (cuentas)
async function staffOfMatch(matchId) {
  const as = await prisma.matchAssignment.findMany({ where: { matchId }, select: { profileId: true, userId: true } });
  const viaProfile = await usersOfProfiles(as.map((a) => a.profileId));
  return [...new Set([...viaProfile, ...as.map((a) => a.userId).filter(Boolean)])];
}

async function matchInfo(matchId) {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, scheduledAt: true, court: true, teamAId: true, teamBId: true, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
  });
  if (!m) return null;
  return { ...m, label: (m.teamA?.name ?? 'A definir') + ' vs ' + (m.teamB?.name ?? 'A definir') };
}

const MATCH_TEXT = {
  moved: 'Cambió el horario o la cancha',
  cancelled: 'Partido cancelado',
  suspended: 'Partido suspendido',
  rescheduled: 'Partido reprogramado',
  finished: 'Partido finalizado',
};

// Cambio en un partido: avisa a su árbitro, su mesa y los jugadores de ambos equipos
async function notifyMatchChange(matchId, kind, { to = ['staff', 'players'], stamp = '' } = {}) {
  try {
    const m = await matchInfo(matchId);
    if (!m) return;
    const ids = [];
    if (to.includes('staff')) ids.push(...(await staffOfMatch(matchId)));
    if (to.includes('players')) ids.push(...(await playersOfTeams([m.teamAId, m.teamBId])));
    const detail = kind === 'cancelled' || kind === 'finished' ? '' : ' · ' + fmtDate(m.scheduledAt) + (m.court ? ' · cancha ' + m.court : '');
    await notify(ids, {
      type: 'match_' + kind, title: MATCH_TEXT[kind], body: m.label + detail, link: '/partido/' + matchId,
      key: 'match:' + kind + ':' + matchId + ':' + (stamp || +new Date(m.scheduledAt ?? 0)),
    });
  } catch (e) { console.error('[notify] partido', e.message); }
}

// Asignación de árbitro o mesa (assigned) o baja de la asignación (removed)
async function notifyAssignment(matchId, assignment, kind) {
  try {
    const m = await matchInfo(matchId);
    if (!m) return;
    const ids = assignment.userId ? [assignment.userId] : await usersOfProfiles([assignment.profileId]);
    if (!ids.length) return;
    const rol = assignment.function === 'REFEREE' ? 'árbitro' : 'mesa';
    await notify(ids, {
      type: 'assignment_' + kind,
      title: kind === 'assigned' ? 'Te asignaron a un partido' : 'Te sacaron de un partido',
      body: (kind === 'assigned' ? 'Como ' + rol + ': ' : 'Ya no sos ' + rol + ' de ') + m.label + (kind === 'assigned' ? ' · ' + fmtDate(m.scheduledAt) : ''),
      link: kind === 'assigned' ? '/asignaciones' : null,
      key: 'assign:' + kind + ':' + (assignment.id ?? matchId) + ':' + Date.now(),
    });
  } catch (e) { console.error('[notify] asignación', e.message); }
}

module.exports = { notify, setIo, usersOfProfiles, adminUserIds, notifyMatchChange, notifyAssignment, serialize };
