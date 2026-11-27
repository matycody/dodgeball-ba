// Coincidencias entre cuentas que se registraron y personas que la organización ya inscribió (sin cuenta).
// Solo sugiere: la decisión de vincular es del admin.
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean)
const compact = (s) => norm(s).replace(/[^a-z]/g, '')
const sameName = (a, b) => {
  const x = tokens(a).sort().join(' ')
  return x !== '' && x === tokens(b).sort().join(' ')
}
const DEMO = /@demo\.pps$/i
export const STRONG = 80 // desde acá la coincidencia es fuerte (mismo DNI o mismo nombre)

export function computeMatches(profiles, users, requests) {
  if (!profiles || !users) return []
  const linked = new Set(users.filter((u) => u.profileId).map((u) => u.profileId))
  const fichas = profiles.filter((p) => p.active && !linked.has(p.id) && !DEMO.test(p.email ?? ''))
  const reqByUser = new Map((requests ?? []).map((r) => [r.user?.id ?? r.userId, r]))
  const out = []
  for (const u of users) {
    if (u.profileId || !u.active) continue
    const req = reqByUser.get(u.id)
    const hay = compact(u.email.split('@')[0]) + '|' + compact(u.username ?? '')
    const cands = []
    for (const p of fichas) {
      const why = []
      let score = 0
      if (req?.dni && req.dni === p.dni) { why.push('Mismo DNI'); score = 100 }
      if (req && sameName(req.name, p.name)) { why.push('Mismo nombre'); score = Math.max(score, STRONG) }
      const parts = tokens(p.name).filter((t) => t.length >= 3)
      if (parts.length >= 2 && parts.every((t) => hay.includes(t))) { why.push('Nombre parecido al mail'); score = Math.max(score, 40) }
      if (why.length) cands.push({ p, why, score })
    }
    if (cands.length) {
      cands.sort((a, b) => b.score - a.score)
      out.push({ u, req, cands: cands.slice(0, 3), score: cands[0].score })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

// Pares que el admin marcó como "no es la misma" (por dispositivo)
const KEY = 'vinculacion-descartadas'
export const readDescartadas = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() } }
export const saveDescartadas = (set) => { try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch { /* sin storage */ } }
export const pairKey = (uid, pid) => uid + ':' + pid
