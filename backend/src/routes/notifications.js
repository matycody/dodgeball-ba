const express = require('express');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { serialize } = require('../lib/notify');

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
