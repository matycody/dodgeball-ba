// Búsqueda sin distinguir acentos ni mayúsculas ("moran" encuentra "Morán"). Sin extensiones de Postgres:
// se cargan los textos (pocas filas) y se filtra en memoria; la consulta final usa los ids resultantes.
const plain = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Filas { id, ...campos } de un modelo, para filtrar varias veces sin volver a la base
const loadRows = (prisma, model, fields, where = {}) =>
  prisma[model].findMany({ where, select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) } });

// ids de las filas donde algún campo contiene el texto
const idsOf = (rows, fields, term) => {
  const t = plain(term);
  return rows.filter((r) => fields.some((f) => plain(r[f]).includes(t))).map((r) => r.id);
};

module.exports = { plain, loadRows, idsOf };
