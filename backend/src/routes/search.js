const express = require('express');
const prisma = require('../db');
const { VENUE_SELECT } = require('../lib/venue');
const { optionalAuth } = require('../middleware/auth');

// Búsqueda global para todos los roles; cada rol ve solo las secciones que le corresponden:
// visitante: torneos, equipos y partidos | logueado: + jugadores | árbitro: + árbitros | organización: todo (+ usuarios, DNI y mails)
const router = express.Router();
router.use(optionalAuth);

const LIMIT = 20;
const MATCH_LIMIT = 30;
const BRANCH_LABEL = { MIXED: 'mixto', MALE: 'masculino', FEMALE: 'femenino' };
const MODALITY_LABEL = { FOAM: 'foam', CLOTH: 'cloth' };
const ROLE_LABEL = { ADMIN: 'organizador', PLAYER: 'jugador', REFEREE: 'arbitro' };

const { plain, loadRows, idsOf } = require('../lib/fold');
const has = (field, w) => ({ [field]: { contains: w, mode: 'insensitive' } }); // solo para campos sin acentos (mail)

const teamSel = { select: { id: true, name: true, logo: true } };
const matchSelect = {
  id: true, status: true, court: true, branch: true, modality: true, scheduledAt: true, timeSet: true, finishedAt: true,
  tournament: { select: { id: true, name: true } },
  venue: { select: VENUE_SELECT },
  teamA: teamSel,
  teamB: teamSel,
};
const personSelect = {
  id: true, name: true, nickname: true, number: true, dni: true, active: true,
  teams: { where: { to: null }, select: { branch: true, team: { select: { id: true, name: true } } } },
};

// Cada palabra tiene que aparecer en algún campo de la lista
const allWords = (words, build) => ({ AND: words.map((w) => ({ OR: build(w) })) });

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    const roles = req.user?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');
    const canPlayers = !!req.user;
    const canReferees = isAdmin || roles.includes('REFEREE');
    const out = { q, tournaments: [], teams: [], players: [], referees: [], users: [], next: [], past: [] };
    if (q.length < 2) return res.json(out);

    // Textos cargados una vez: los nombres se comparan sin acentos ("moran" = "Morán")
    const [teamRows, tourRows, profRows] = await Promise.all([
      loadRows(prisma, 'team', ['name']),
      loadRows(prisma, 'tournament', ['name', 'edition']),
      loadRows(prisma, 'profile', ['name', 'nickname', 'dni', 'email']),
    ]);
    const teamIds = (w) => ({ id: { in: idsOf(teamRows, ['name'], w) } });
    const tourIds = (w) => ({ id: { in: idsOf(tourRows, ['name'], w) } });
    const personIds = (w) => ({ id: { in: idsOf(profRows, isAdmin ? ['name', 'nickname', 'dni', 'email'] : ['name', 'nickname'], w) } });

    const person = (extra) => ({
      where: {
        ...extra,
        ...(isAdmin ? {} : { active: true }),
        ...allWords(words, (w) => [personIds(w)]),
      },
    });
    // Solo la organización ve torneos en borrador
    const pubTournament = isAdmin ? { deletedAt: null } : { status: { not: 'DRAFT' }, pausedAt: null, deletedAt: null };

    const matchWhere = {
      hiddenAt: null,
      ...(isAdmin ? {} : { OR: [{ tournamentId: null }, { tournament: { status: { not: 'DRAFT' } } }] }),
      ...allWords(words, (w) => {
        const or = [
          { teamA: teamIds(w) },
          { teamB: teamIds(w) },
          { tournament: tourIds(w) },
        ];
        const mods = Object.keys(MODALITY_LABEL).filter((k) => MODALITY_LABEL[k].includes(w));
        if (mods.length) or.push({ modality: { in: mods } });
        const brs = Object.keys(BRANCH_LABEL).filter((k) => BRANCH_LABEL[k].includes(w));
        if (brs.length) or.push({ branch: { in: brs } });
        if ('amistoso'.includes(w)) or.push({ tournamentId: null });
        return or;
      }),
    };

    const userWhere = allWords(words, (w) => {
      const or = [has('email', w), { profile: personIds(w) }];
      const roles = Object.keys(ROLE_LABEL).filter((k) => ROLE_LABEL[k].includes(plain(w)));
      if (roles.length) roles.forEach((r) => or.push({ roles: { has: r } }));
      return or;
    });

    const [tournaments, teams, players, referees, users, next, past] = await Promise.all([
      prisma.tournament.findMany({
        where: { ...pubTournament, ...allWords(words, (w) => [{ id: { in: idsOf(tourRows, ['name', 'edition'], w) } }]) },
        select: { id: true, name: true, edition: true, year: true, status: true, branch: true, modality: true },
        orderBy: [{ year: 'desc' }, { name: 'asc' }],
        take: LIMIT,
      }),
      prisma.team.findMany({ where: allWords(words, (w) => [teamIds(w)]), select: { id: true, name: true, logo: true }, orderBy: { name: 'asc' }, take: LIMIT }),
      canPlayers ? prisma.profile.findMany({ ...person({ isPlayer: true }), select: personSelect, orderBy: { name: 'asc' }, take: LIMIT }) : [],
      canReferees ? prisma.profile.findMany({ ...person({ isReferee: true }), select: personSelect, orderBy: { name: 'asc' }, take: LIMIT }) : [],
      isAdmin ? prisma.user.findMany({
        where: userWhere,
        select: { id: true, email: true, roles: true, active: true, profile: { select: { id: true, name: true } } },
        orderBy: { email: 'asc' },
        take: LIMIT,
      }) : [],
      prisma.match.findMany({
        where: { ...matchWhere, status: { in: ['LIVE', 'READY', 'SCHEDULED', 'SUSPENDED'] } },
        select: matchSelect,
        orderBy: [{ scheduledAt: 'asc' }, { court: 'asc' }],
        take: MATCH_LIMIT,
      }),
      prisma.match.findMany({
        where: { ...matchWhere, status: { in: ['FINISHED', 'CANCELLED'] } },
        select: matchSelect,
        orderBy: [{ scheduledAt: { sort: 'desc', nulls: 'last' } }],
        take: MATCH_LIMIT,
      }),
    ]);

    // DNI solo para la organización
    const clean = (list) => list.map((p) => (isAdmin ? p : { ...p, dni: undefined }));
    res.json({ ...out, tournaments, teams, players: clean(players), referees: clean(referees), users, next, past });
  } catch (err) {
    console.error('[search]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
