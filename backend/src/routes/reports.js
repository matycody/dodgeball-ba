const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const prisma = require('../db');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const storage = require('../services/storage');

// Reportes de problemas: los envía cualquier persona (con o sin cuenta) y solo los lee la organización.
const router = express.Router();
const admin = [authenticate, requireRole('ADMIN')];

const KINDS = ['ERROR', 'VISUAL', 'SUGGESTION', 'OTHER'];
const STATUSES = ['NEW', 'IN_REVIEW', 'RESOLVED', 'DISCARDED'];
const MAX_IMAGES = 3;

// Anti-spam: pocos reportes por hora y por IP (y un poco más de margen para subir las capturas)
const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Enviaste muchos reportes seguidos, probá más tarde' },
});
const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas imágenes seguidas, probá más tarde' },
});

const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// Últimos errores de consola: lista corta de textos
function cleanErrors(v) {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x) => typeof x === 'string' && x.trim()).slice(-5).map((x) => x.slice(0, 300));
  return out.length ? out : null;
}

// Crea el reporte. Devuelve una clave para subir las capturas (solo sirve para este reporte).
router.post('/', optionalAuth, sendLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    const message = text(b.message, 2000);
    if (!message || message.length < 5) return res.status(400).json({ error: 'Contanos qué pasó (al menos unas palabras)' });
    const kind = KINDS.includes(b.kind) ? b.kind : 'ERROR';
    const email = text(b.contactEmail, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'El mail de contacto no es válido' });

    const uploadKey = crypto.randomBytes(16).toString('hex');
    const r = await prisma.bugReport.create({
      data: {
        kind,
        message,
        page: text(b.page, 300),
        userAgent: text(req.headers['user-agent'], 300),
        viewport: text(b.viewport, 20),
        consoleErrors: cleanErrors(b.consoleErrors) ?? undefined,
        contactEmail: req.user ? null : email, // con cuenta ya sabemos quién es
        userId: req.user?.id ?? null,
        uploadKey,
      },
      select: { id: true },
    });
    res.status(201).json({ id: r.id, uploadKey, maxImages: MAX_IMAGES });
  } catch (err) {
    console.error('[reports]', err);
    res.status(500).json({ error: 'No pudimos guardar el reporte, probá de nuevo' });
  }
});

// Sube una captura (el cuerpo es la imagen). Hasta 3 por reporte, solo con la clave que devolvió el alta.
router.post('/:id/images', imageLimiter, storage.imageBody, async (req, res) => {
  try {
    const key = String(req.query.key || '');
    const r = await prisma.bugReport.findUnique({ where: { id: req.params.id }, select: { id: true, uploadKey: true, images: true } });
    const ok = r && key.length === r.uploadKey.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(r.uploadKey));
    if (!ok) return res.status(403).json({ error: 'Sin permiso para este reporte' });
    if (r.images.length >= MAX_IMAGES) return res.status(409).json({ error: 'Ya tiene ' + MAX_IMAGES + ' capturas' });

    const webp = await storage.processImage(req.body, 'cover');
    const path = 'reports/' + r.id + '/' + crypto.randomBytes(6).toString('hex') + '.webp';
    await storage.uploadReportImage(path, webp);
    await prisma.bugReport.update({ where: { id: r.id }, data: { images: { push: path } } });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.message === 'INVALID_IMAGE') return res.status(400).json({ error: 'El archivo no es una imagen válida (si es HEIC de iPhone, sacala como captura de pantalla)' });
    console.error('[reports:image]', err);
    res.status(500).json({ error: 'No pudimos subir la captura' });
  }
});

// Organización: listado (filtros por estado y tipo) con las capturas firmadas y el conteo por estado
router.get('/', ...admin, async (req, res) => {
  try {
    const where = {};
    if (STATUSES.includes(req.query.status)) where.status = req.query.status;
    if (KINDS.includes(req.query.kind)) where.kind = req.query.kind;
    const [rows, grouped] = await Promise.all([
      prisma.bugReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { user: { select: { id: true, email: true, username: true, roles: true, profile: { select: { name: true } } } } },
      }),
      prisma.bugReport.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const paths = rows.flatMap((r) => r.images);
    const signed = await storage.signedReportUrls(paths);
    const byPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const g of grouped) counts[g.status] = g._count._all;
    res.json({
      counts,
      items: rows.map(({ uploadKey, images, user, ...r }) => ({
        ...r,
        images: images.map((p) => byPath.get(p)).filter(Boolean),
        user: user ? { id: user.id, email: user.email, username: user.username, name: user.profile?.name ?? null, roles: user.roles } : null,
      })),
    });
  } catch (err) {
    console.error('[reports]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Cantidad de reportes nuevos (burbuja del menú)
router.get('/new-count', ...admin, async (req, res) => {
  try {
    res.json({ count: await prisma.bugReport.count({ where: { status: 'NEW' } }) });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Organización: cambiar estado y/o dejar una nota interna
router.patch('/:id', ...admin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {};
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Estado inválido' });
      data.status = b.status;
      data.resolvedAt = b.status === 'RESOLVED' || b.status === 'DISCARDED' ? new Date() : null;
    }
    if (b.adminNote !== undefined) data.adminNote = text(b.adminNote, 1000);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nada para cambiar' });
    const r = await prisma.bugReport.update({ where: { id: req.params.id }, data, select: { id: true, status: true, adminNote: true, resolvedAt: true } });
    res.json(r);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Reporte no encontrado' });
    console.error('[reports]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Organización: borrar el reporte y sus capturas
router.delete('/:id', ...admin, async (req, res) => {
  try {
    const r = await prisma.bugReport.findUnique({ where: { id: req.params.id }, select: { images: true } });
    if (!r) return res.status(404).json({ error: 'Reporte no encontrado' });
    for (const p of r.images) await storage.removeFile(storage.REPORTS_BUCKET, p).catch(() => {});
    await prisma.bugReport.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[reports]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
