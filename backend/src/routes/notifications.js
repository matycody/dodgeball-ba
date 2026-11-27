const express = require('express');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { serialize, pushEnabled } = require('../lib/notify');

const router = express.Router();
router.use(authenticate);

const MAX = 50;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // los avisos viejos no se muestran (y se limpian al listar)

// Últimos avisos + cuántos faltan leer. Sin la tabla (falta migrar) responde vacío.
router.get('/', async (req, res) => {
  try {
    if (!prisma.notification) return res.json({ items: [], unread: 0 });
    const since = new Date(Date.now() - RETENTION_MS);
    prisma.notification.deleteMany({ where: { userId: req.user.id, createdAt: { lt: since } } }).catch(() => {});
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user.id, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: MAX }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null, createdAt: { gte: since } } }),
    ]);
    res.json({ items: items.map(serialize), unread });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.json({ items: [], unread: 0 });
  }
});

// ── Push y preferencias ──
const GROUPS = ['matches', 'assignments', 'requests'];

router.get('/push/config', (req, res) => res.json({ enabled: pushEnabled(), publicKey: pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null }));

router.post('/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!pushEnabled() || !prisma.pushSubscription) return res.status(503).json({ error: 'Las notificaciones fuera de la web no están activas' });
    if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 600 || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' });
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: req.user.id, endpoint, p256dh: String(keys.p256dh), auth: String(keys.auth) },
      update: { userId: req.user.id, p256dh: String(keys.p256dh), auth: String(keys.auth) },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (prisma.pushSubscription && typeof endpoint === 'string') await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/prefs', async (req, res) => {
  try {
    const pref = prisma.notifPref ? await prisma.notifPref.findUnique({ where: { userId: req.user.id } }) : null;
    res.json({ off: pref?.off ?? [] });
  } catch (err) {
    res.json({ off: [] });
  }
});

router.put('/prefs', async (req, res) => {
  try {
    if (!prisma.notifPref) return res.status(503).json({ error: 'No disponible todavía' });
    const off = [...new Set((Array.isArray(req.body?.off) ? req.body.off : []).filter((g) => GROUPS.includes(g)))];
    await prisma.notifPref.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, off }, update: { off } });
    res.json({ off });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    if (prisma.notification) await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    if (prisma.notification) await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
