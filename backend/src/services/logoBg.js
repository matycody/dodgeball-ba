// Quita el fondo claro (blanco, gris claro o "tablero" de transparencia falso) que algunos escudos traen pintado en la imagen,
// para que todos se vean igual sobre el color del tema. Solo borra lo claro y sin color que toca el borde de la imagen:
// el blanco de adentro del escudo (conectado al resto del dibujo) no se toca. Si no hay fondo claro, devuelve la imagen igual.
const sharp = require('sharp');

const LIGHT = 196; // brillo mínimo para considerarlo fondo
const SAT = 28; // diferencia máxima entre canales (casi gris)

// buffer: imagen ya redimensionada. Devuelve { data, width, height, changed } con RGBA crudo.
async function removeLightBackground(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isBg = (i) => {
    if (data[i + 3] < 8) return true; // ya transparente
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) >= LIGHT && Math.max(r, g, b) - Math.min(r, g, b) <= SAT;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const p = y * w + x; if (!seen[p] && isBg(p * 4)) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  let removed = 0;
  for (let p = 0; p < seen.length; p++) if (seen[p]) removed++;
  // Si casi todo es "fondo" (logo blanco sobre transparente) o casi nada, no se toca
  if (removed < w * h * 0.02 || removed > w * h * 0.92) return { data, width: w, height: h, changed: false };

  const out = Buffer.from(data);
  for (let p = 0; p < seen.length; p++) if (seen[p]) out[p * 4 + 3] = 0;
  // Borde suave: píxeles claros pegados al fondo borrado quedan semi-transparentes (evita el halo blanco)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      const near = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
      if (!near) continue;
      const i = p * 4;
      const light = Math.min(out[i], out[i + 1], out[i + 2]);
      if (light > 150) out[i + 3] = Math.max(0, Math.round(255 * (1 - (light - 150) / 105)));
    }
  }
  return { data: out, width: w, height: h, changed: true };
}

module.exports = { removeLightBackground };
