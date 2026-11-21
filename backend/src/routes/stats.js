const express = require('express');
const prisma = require('../db');
const { matchResult } = require('../services/bracket');
const { teamCareer } = require('../services/teamCareer');
const { resolveChampions } = require('../services/champion');
const { podiums } = require('../services/podium');
const { matchPoints } = require('../services/standings');

const router = express.Router();
const TEAM_SELECT = { id: true, name: true, logo: true };

function fail(err, res) {
  if (err && err.name === 'PrismaClientValidationError') return res.status(400).json({ error: 'Filtro inválido' });
  console.error('[stats]', require('../lib/briefErr').briefErr(err));
  return res.status(500).json({ error: 'Error interno' });
}

// Filtros comunes: yearFrom, yearTo, branch, modality (sobre el torneo del partido)
function tournamentFilter(q) {
  const where = { deletedAt: null }; // los torneos eliminados no cuentan en ninguna estadística
  const years = {};
  for (const [key, op] of [['yearFrom', 'gte'], ['yearTo', 'lte']]) {
    if (q[key] === undefined) continue;
    const y = Number(q[key]);
    if (!Number.isInteger(y) || y < 1900 || y > 9999) return { error: key + ' inválido' };
    years[op] = y;
  }
  if (Object.keys(years).length) where.year = years;
  if (q.branch !== undefined) where.branch = String(q.branch);
  if (q.modality !== undefined) where.modality = String(q.modality);
  return { where };
}

// Totales de un equipo sobre una lista de partidos terminados
function tally(teamId, matches) {
  const t = { played: 0, won: 0, drawn: 0, lost: 0, setsFor: 0, setsAgainst: 0 };
  for (const m of matches) {
    const r = matchResult(m);
    if (!r) continue;
    const mine = m.teamAId === teamId ? r.setsA : r.setsB;
    const theirs = m.teamAId === teamId ? r.setsB : r.setsA;
    t.played++;
    t.setsFor += mine;
    t.setsAgainst += theirs;
    if (mine > theirs) t.won++;
    else if (mine === theirs) t.drawn++;
    else t.lost++;
  }
  return t;
}


const whenOf = (m) => (m.finishedAt ?? m.scheduledAt)?.getTime() ?? 0;

// Los récords de diferencia de sets y de sets veloces solo cuentan partidos desde esta fecha: lo anterior se cargó a mano, sin correr el cronómetro, y los distorsiona.
// Se puede cambiar con la variable RECORDS_FROM (ISO, ej. 2027-03-01T00:00:00-03:00).
const RECORDS_FROM = new Date(process.env.RECORDS_FROM || '2027-01-01T00:00:00-03:00').getTime();

// Últimos N resultados de un equipo, del más viejo al más nuevo: 'W' | 'D' | 'L'
function formOf(teamId, matches, n) {
  return matches
    .filter((m) => matchResult(m))
    .sort((a, b) => whenOf(b) - whenOf(a))
    .slice(0, n)
    .reverse()
    .map((m) => {
      const r = matchResult(m);
      const mine = m.teamAId === teamId ? r.setsA : r.setsB;
      const theirs = m.teamAId === teamId ? r.setsB : r.setsA;
      return mine > theirs ? 'W' : mine === theirs ? 'D' : 'L';
    });
}

const MATCH_SELECT = {
  id: true, teamAId: true, teamBId: true, finishedAt: true, scheduledAt: true,
  tournament: { select: { id: true, name: true, year: true } },
  sets: { select: { winnerTeamId: true } },
};

// Campeones por torneo y títulos por equipo
router.get('/champions', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const rows = await prisma.tournament.findMany({
      where: { ...f.where, status: 'FINISHED' },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, year: true, edition: true, branch: true, modality: true, championId: true,
        champion: { select: TEAM_SELECT },
      },
    });
    // Si el torneo se cerró sin guardar campeón, se deduce de la final
    const missing = await resolveChampions(rows.filter((t) => !t.championId).map((t) => t.id));
    const teams = missing.size ? await prisma.team.findMany({ where: { id: { in: [...new Set(missing.values())] } }, select: TEAM_SELECT }) : [];
    const list = rows
      .map((t) => ({ ...t, champion: t.champion ?? teams.find((x) => x.id === missing.get(t.id)) ?? null }))
      .filter((t) => t.champion)
      .map(({ championId, ...t }) => t);
    const pods = await podiums(rows.map((t) => ({ id: t.id, championId: t.championId ?? missing.get(t.id) ?? null })));
    for (const t of list) t.podium = pods.get(t.id) ?? null;
    const titles = new Map();
    for (const t of list) {
      const e = titles.get(t.champion.id) || { team: t.champion, titles: 0 };
      e.titles++;
      titles.set(t.champion.id, e);
    }
    res.json({
      tournaments: list,
      titles: [...titles.values()].sort((a, b) => b.titles - a.titles || a.team.name.localeCompare(b.team.name)),
    });
  } catch (err) {
    fail(err, res);
  }
});

// Historial de un equipo: récord, títulos y posición en cada torneo
router.get('/teams/:id', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: TEAM_SELECT });
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
    const tournament = f.where;

    const [matches, titles, standings, enrolled] = await Promise.all([
      prisma.match.findMany({
        where: { status: 'FINISHED', hiddenAt: null, OR: [{ teamAId: team.id }, { teamBId: team.id }], tournament },
        select: MATCH_SELECT,
      }),
      prisma.tournament.findMany({
        where: { ...tournament, championId: team.id, status: 'FINISHED' },
        orderBy: [{ year: 'desc' }],
        select: { id: true, name: true, year: true, edition: true },
      }),
      prisma.stageStanding.findMany({
        where: { teamId: team.id, stage: { tournament } },
        select: {
          position: true, points: true, played: true, tied: true, zone: true,
          stage: { select: { name: true, tournament: { select: { id: true, name: true, year: true } } } },
        },
      }),
      prisma.tournamentTeam.count({ where: { teamId: team.id, tournament } }),
    ]);

    const career = await teamCareer(team.id, tournament).catch((e) => { console.error('[career]', e.message); return []; });
    // Títulos: guardados al cerrar + deducidos de la final si el campeón no quedó guardado
    const known = new Set(titles.map((x) => x.id));
    const titlesAll = [
      ...titles,
      ...career.filter((c) => c.result?.kind === 'CHAMPION' && c.status === 'FINISHED' && !known.has(c.tournamentId))
        .map((c) => ({ id: c.tournamentId, name: c.tournament, year: c.year, edition: c.edition })),
    ];

    res.json({
      team,
      career,
      tournamentsPlayed: enrolled,
      titles: titlesAll.length,
      titlesList: titlesAll,
      record: tally(team.id, matches),
      form: formOf(team.id, matches, 5),
      history: standings
        .map((s) => ({
          tournamentId: s.stage.tournament.id,
          tournament: s.stage.tournament.name,
          year: s.stage.tournament.year,
          stage: s.stage.name,
          position: s.position,
          points: s.points,
          played: s.played,
          tied: s.tied,
          zone: s.zone,
        }))
        .sort((a, b) => b.year - a.year || a.tournament.localeCompare(b.tournament)),
    });
  } catch (err) {
    fail(err, res);
  }
});

// Historial entre dos equipos: ?teamA=&teamB=
router.get('/head-to-head', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const a = String(req.query.teamA || '');
    const b = String(req.query.teamB || '');
    if (!a || !b || a === b) return res.status(400).json({ error: 'Indicá teamA y teamB (distintos)' });
    const teams = await prisma.team.findMany({ where: { id: { in: [a, b] } }, select: TEAM_SELECT });
    if (teams.length !== 2) return res.status(404).json({ error: 'Equipo no encontrado' });

    const matches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        hiddenAt: null,
        tournament: f.where,
        OR: [{ teamAId: a, teamBId: b }, { teamAId: b, teamBId: a }],
      },
      orderBy: [{ finishedAt: 'desc' }],
      select: MATCH_SELECT,
    });
    const list = matches
      .map((m) => {
        const r = matchResult(m);
        if (!r) return null;
        return {
          id: m.id,
          tournament: m.tournament,
          date: m.finishedAt || m.scheduledAt,
          setsA: m.teamAId === a ? r.setsA : r.setsB,
          setsB: m.teamAId === a ? r.setsB : r.setsA,
        };
      })
      .filter(Boolean);
    const rec = (x, y) => list.reduce((n, m) => n + (m[x] > m[y] ? 1 : 0), 0);
    res.json({
      teamA: teams.find((t) => t.id === a),
      teamB: teams.find((t) => t.id === b),
      played: list.length,
      winsA: rec('setsA', 'setsB'),
      winsB: rec('setsB', 'setsA'),
      draws: list.filter((m) => m.setsA === m.setsB).length,
      matches: list,
    });
  } catch (err) {
    fail(err, res);
  }
});

// Resumen general: totales, ranking histórico y récords (mismos filtros que el resto)
router.get('/records', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const tournament = f.where;
    const [matches, tournaments, champRows] = await Promise.all([
      prisma.match.findMany({
        where: { status: 'FINISHED', hiddenAt: null, teamAId: { not: null }, teamBId: { not: null }, tournament },
        select: {
          ...MATCH_SELECT,
          teamA: { select: TEAM_SELECT },
          teamB: { select: TEAM_SELECT },
        },
      }),
      prisma.tournamentTeam.findMany({ where: { tournament }, select: { teamId: true, tournamentId: true } }),
      prisma.tournament.findMany({ where: { ...tournament, status: 'FINISHED' }, select: { id: true, championId: true } }),
    ]);

    const teams = new Map();
    const get = (t) => { if (!teams.has(t.id)) teams.set(t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, titles: 0 }); return teams.get(t.id); };
    let sets = 0;
    let blowout = null;
    const ordered = matches.filter((m) => matchResult(m)).sort((a, b) => whenOf(a) - whenOf(b));
    const run = new Map(); // equipo -> racha de victorias en curso
    let streak = null;
    for (const m of ordered) {
      const r = matchResult(m);
      sets += r.setsA + r.setsB;
      const a = get(m.teamA);
      const b = get(m.teamB);
      a.played++; b.played++;
      if (r.setsA > r.setsB) { a.won++; b.lost++; } else if (r.setsA < r.setsB) { b.won++; a.lost++; } else { a.drawn++; b.drawn++; }
      const winner = r.setsA > r.setsB ? m.teamA : r.setsA < r.setsB ? m.teamB : null;
      for (const t of [m.teamA, m.teamB]) {
        const n = winner && winner.id === t.id ? (run.get(t.id) ?? 0) + 1 : 0;
        run.set(t.id, n);
        if (n && (!streak || n > streak.n)) streak = { team: t, n };
      }
      const diff = Math.abs(r.setsA - r.setsB);
      if (diff && whenOf(m) >= RECORDS_FROM && (!blowout || diff > blowout.diff)) blowout = { matchId: m.id, diff, winner: r.setsA > r.setsB ? m.teamA : m.teamB, loser: r.setsA > r.setsB ? m.teamB : m.teamA, score: [Math.max(r.setsA, r.setsB), Math.min(r.setsA, r.setsB)], tournament: m.tournament?.name ?? null };
    }

    // Partido con los sets más veloces: duración promedio de set de cada partido, según el momento en que se decidió cada uno (half + matchSecond).
    // Solo cuentan partidos con 3 sets o más y todos con su registro de tiempo (los cargados antes de existir el registro quedan afuera).
    const stamps = await prisma.matchSet.findMany({
      where: { matchId: { in: ordered.filter((m) => whenOf(m) >= RECORDS_FROM).map((m) => m.id) } },
      select: { matchId: true, number: true, half: true, matchSecond: true },
      orderBy: [{ matchId: 'asc' }, { number: 'asc' }],
    });
    const bySet = new Map();
    for (const s of stamps) { if (!bySet.has(s.matchId)) bySet.set(s.matchId, []); bySet.get(s.matchId).push(s); }
    const byId = new Map(ordered.map((m) => [m.id, m]));
    let fastest = null;
    for (const [matchId, list] of bySet) {
      if (list.length < 3 || list.some((s) => s.half == null || s.matchSecond == null)) continue;
      const at = list.map((s) => (s.half - 1) * 20 * 60 + s.matchSecond); // segundos de juego transcurridos cuando se decidió cada set
      if (at.some((x, i) => x < (i ? at[i - 1] : 0))) continue; // registro incoherente: se ignora
      const avg = at[at.length - 1] / list.length; // promedio de duración de set de este partido
      if (avg > 0 && (!fastest || avg < fastest.avgSeconds)) {
        const m = byId.get(matchId);
        fastest = { matchId, sets: list.length, avgSeconds: Math.round(avg), teamA: m.teamA, teamB: m.teamB, tournament: m.tournament?.name ?? null };
      }
    }

    // Partido con más sanciones (advertencias y tarjetas; las deshechas por la mesa no cuentan)
    const sanctionRows = await prisma.matchSanction.groupBy({
      by: ['matchId'],
      where: { matchId: { in: ordered.map((m) => m.id) }, revokedAt: null },
      _count: { _all: true },
    });
    let sanctioned = null;
    for (const row of sanctionRows) {
      const n = row._count._all;
      if (n > 0 && (!sanctioned || n > sanctioned.count)) {
        const m = byId.get(row.matchId);
        sanctioned = { matchId: row.matchId, count: n, teamA: m.teamA, teamB: m.teamB, tournament: m.tournament?.name ?? null };
      }
    }

    // Títulos (si el torneo se cerró sin campeón guardado, se deduce de la final)
    const missing = await resolveChampions(champRows.filter((t) => !t.championId).map((t) => t.id));
    const champIds = champRows.map((t) => t.championId ?? missing.get(t.id)).filter(Boolean);
    const champTeams = champIds.length ? await prisma.team.findMany({ where: { id: { in: [...new Set(champIds)] } }, select: TEAM_SELECT }) : [];
    for (const id of champIds) {
      const t = champTeams.find((x) => x.id === id);
      if (t) get(t).titles++;
    }

    const rows = [...teams.values()].map((e) => ({ ...e, pct: e.played ? Math.round((e.won / e.played) * 100) : 0 }));
    const ranking = rows
      .sort((a, b) => b.titles - a.titles || b.pct - a.pct || b.played - a.played || a.team.name.localeCompare(b.team.name)); // todos los equipos: cada pantalla recorta lo que muestra
    const unbeaten = rows.filter((e) => e.played >= 3 && e.lost === 0).sort((a, b) => b.played - a.played)[0] ?? null;

    res.json({
      totals: {
        matches: ordered.length,
        sets,
        tournaments: champRows.length,
        teams: new Set(tournaments.map((x) => x.teamId)).size,
      },
      ranking,
      records: {
        streak,
        blowout,
        fastest,
        sanctioned,
        unbeaten: unbeaten ? { team: unbeaten.team, played: unbeaten.played } : null,
      },
    });
  } catch (err) {
    fail(err, res);
  }
});

// Tablas por equipo: sets y puntos a favor / en contra (Foam 1 por set, Cloth 2 por set y 1 cada uno si el set empata)
// y sanciones recibidas (sin contar las deshechas por la mesa). Mismos filtros que el resto.
router.get('/team-tables', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const where = { hiddenAt: null, teamAId: { not: null }, teamBId: { not: null }, tournament: f.where };
    const [matches, sanctions] = await Promise.all([
      prisma.match.findMany({
        where: { ...where, status: 'FINISHED' },
        select: { teamAId: true, teamBId: true, modality: true, sets: { select: { winnerTeamId: true } }, teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } },
      }),
      prisma.matchSanction.findMany({
        where: { revokedAt: null, match: where },
        select: { side: true, kind: true, match: { select: { teamAId: true, teamBId: true, teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } } } },
      }),
    ]);
    const teams = new Map();
    const get = (t) => {
      if (!teams.has(t.id)) teams.set(t.id, { team: t, played: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0, sanctions: { WARNING: 0, YELLOW: 0, BLUE: 0, RED: 0, total: 0 } });
      return teams.get(t.id);
    };
    for (const m of matches) {
      const r = matchResult(m);
      if (!r) continue; // ningún set decidido: no suma
      const pts = matchPoints(m);
      const a = get(m.teamA);
      const b = get(m.teamB);
      a.played++; b.played++;
      a.setsWon += r.setsA; a.setsLost += r.setsB; a.pointsFor += pts.a; a.pointsAgainst += pts.b;
      b.setsWon += r.setsB; b.setsLost += r.setsA; b.pointsFor += pts.b; b.pointsAgainst += pts.a;
    }
    for (const x of sanctions) {
      const e = get(x.side === 'A' ? x.match.teamA : x.match.teamB);
      if (e.sanctions[x.kind] !== undefined) e.sanctions[x.kind]++;
      e.sanctions.total++;
    }
    res.json({ teams: [...teams.values()] });
  } catch (err) {
    fail(err, res);
  }
});

// Estadísticas de un torneo: por equipo (sets, puntos, sanciones, rachas) y resumen. Las listas ordenadas las arma el frontend.
router.get('/tournaments/:id', async (req, res) => {
  try {
    const t = await prisma.tournament.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });
    const where = { tournamentId: t.id, hiddenAt: null, teamAId: { not: null }, teamBId: { not: null } };
    const [matches, sanctions] = await Promise.all([
      prisma.match.findMany({
        where: { ...where, status: 'FINISHED' },
        select: { id: true, teamAId: true, teamBId: true, modality: true, finishedAt: true, scheduledAt: true, sets: { select: { winnerTeamId: true } }, teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } },
      }),
      prisma.matchSanction.findMany({
        where: { revokedAt: null, match: where },
        select: { side: true, kind: true, matchId: true, match: { select: { teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } } } },
      }),
    ]);
    const teams = new Map();
    const get = (tm) => {
      if (!teams.has(tm.id)) teams.set(tm.id, { team: tm, played: 0, won: 0, drawn: 0, lost: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0, bestStreak: 0, streak: 0, sanctions: { WARNING: 0, YELLOW: 0, BLUE: 0, RED: 0, total: 0 } });
      return teams.get(tm.id);
    };
    let sets = 0;
    let counted = 0;
    for (const m of [...matches].sort((a, b) => whenOf(a) - whenOf(b))) {
      const r = matchResult(m);
      if (!r) continue;
      counted++;
      sets += r.setsA + r.setsB;
      const pts = matchPoints(m);
      for (const [e, mine, theirs, pf, pa] of [[get(m.teamA), r.setsA, r.setsB, pts.a, pts.b], [get(m.teamB), r.setsB, r.setsA, pts.b, pts.a]]) {
        e.played++;
        e.setsWon += mine; e.setsLost += theirs; e.pointsFor += pf; e.pointsAgainst += pa;
        if (mine > theirs) { e.won++; e.streak++; e.bestStreak = Math.max(e.bestStreak, e.streak); } else { e.streak = 0; if (mine === theirs) e.drawn++; else e.lost++; }
      }
    }
    const perMatch = new Map();
    let sanctionTotal = 0;
    for (const x of sanctions) {
      const e = get(x.side === 'A' ? x.match.teamA : x.match.teamB);
      if (e.sanctions[x.kind] !== undefined) e.sanctions[x.kind]++;
      e.sanctions.total++;
      sanctionTotal++;
      perMatch.set(x.matchId, (perMatch.get(x.matchId) ?? 0) + 1);
    }
    let sanctionedMatch = null;
    if (perMatch.size) {
      const [id, count] = [...perMatch.entries()].sort((a, b) => b[1] - a[1])[0];
      const m = await prisma.match.findUnique({ where: { id }, select: { id: true, teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } } });
      if (m) sanctionedMatch = { matchId: m.id, count, teamA: m.teamA, teamB: m.teamB };
    }
    res.json({
      summary: { matches: counted, sets, sanctions: sanctionTotal },
      teams: [...teams.values()].map(({ streak, ...e }) => ({ ...e, currentStreak: streak })),
      sanctionedMatch,
    });
  } catch (err) {
    fail(err, res);
  }
});

// Estadísticas de un equipo (mismos filtros que /teams/:id: modality y branch): sets, puntos, rachas, sanciones y detalle por torneo
router.get('/teams/:id/summary', async (req, res) => {
  try {
    const f = tournamentFilter(req.query);
    if (f.error) return res.status(400).json({ error: f.error });
    const team = await prisma.team.findUnique({ where: { id: req.params.id }, select: TEAM_SELECT });
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
    const where = { hiddenAt: null, OR: [{ teamAId: team.id }, { teamBId: team.id }], tournament: f.where };
    const [matches, sanctions] = await Promise.all([
      prisma.match.findMany({
        where: { ...where, status: 'FINISHED' },
        select: { id: true, teamAId: true, teamBId: true, modality: true, finishedAt: true, scheduledAt: true, sets: { select: { winnerTeamId: true } }, tournament: { select: { id: true, name: true, year: true } } },
      }),
      prisma.matchSanction.findMany({
        where: { revokedAt: null, match: where },
        select: { side: true, kind: true, matchId: true, match: { select: { teamAId: true, teamBId: true, teamA: { select: TEAM_SELECT }, teamB: { select: TEAM_SELECT } } } },
      }),
    ]);
    const tournaments = new Map();
    let sets = 0, pointsFor = 0, pointsAgainst = 0, streak = 0, bestStreak = 0, counted = 0;
    for (const m of [...matches].sort((a, b) => whenOf(a) - whenOf(b))) {
      const r = matchResult(m);
      if (!r) continue;
      counted++;
      const isA = m.teamAId === team.id;
      const mine = isA ? r.setsA : r.setsB;
      const theirs = isA ? r.setsB : r.setsA;
      const pts = matchPoints(m);
      const pf = isA ? pts.a : pts.b;
      const pa = isA ? pts.b : pts.a;
      sets += r.setsA + r.setsB;
      pointsFor += pf; pointsAgainst += pa;
      if (!tournaments.has(m.tournament.id)) tournaments.set(m.tournament.id, { tournament: m.tournament, played: 0, won: 0, drawn: 0, lost: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0 });
      const e = tournaments.get(m.tournament.id);
      e.played++; e.setsWon += mine; e.setsLost += theirs; e.pointsFor += pf; e.pointsAgainst += pa;
      if (mine > theirs) { e.won++; streak++; bestStreak = Math.max(bestStreak, streak); } else { streak = 0; if (mine === theirs) e.drawn++; else e.lost++; }
    }
    const kinds = { WARNING: 0, YELLOW: 0, BLUE: 0, RED: 0, total: 0 };
    const perMatch = new Map();
    for (const x of sanctions) {
      if ((x.side === 'A' ? x.match.teamAId : x.match.teamBId) !== team.id) continue; // solo las del equipo, no las del rival
      if (kinds[x.kind] !== undefined) kinds[x.kind]++;
      kinds.total++;
      perMatch.set(x.matchId, (perMatch.get(x.matchId) ?? 0) + 1);
    }
    let sanctionedMatch = null;
    if (perMatch.size) {
      const [id, count] = [...perMatch.entries()].sort((a, b) => b[1] - a[1])[0];
      const x = sanctions.find((y) => y.matchId === id);
      sanctionedMatch = { matchId: id, count, teamA: x.match.teamA, teamB: x.match.teamB };
    }
    res.json({
      summary: { matches: counted, sets, sanctions: kinds.total },
      points: { for: pointsFor, against: pointsAgainst },
      streak: { best: bestStreak, current: streak },
      sanctions: kinds,
      sanctionedMatch,
      tournaments: [...tournaments.values()].sort((a, b) => b.tournament.year - a.tournament.year || a.tournament.name.localeCompare(b.tournament.name)),
    });
  } catch (err) {
    fail(err, res);
  }
});

module.exports = router;
