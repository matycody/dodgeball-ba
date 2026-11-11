// Búsqueda sin distinguir acentos ni mayúsculas ("moran" encuentra "Morán"). Sin extensiones de Postgres:
// se cargan los textos (pocas filas) y se filtra en memoria; la consulta final usa los ids resultantes.
const { memo } = require('./memo');
const plain = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Filas { id, ...campos } de un modelo, para filtrar varias veces sin volver a la base
// Se comparte unos segundos entre búsquedas (cada letra tipeada es un pedido) y se vacía con cualquier escritura: así no se leen
// todas las filas en cada pedido (ahorra tráfico de red de la base).
const loadRows = (prisma, model, fields, where = {}) =>
  memo('fold:' + model + ':' + fields.join(',') + ':' + JSON.stringify(where), () =>
    prisma[model].findMany({ where, select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) } }));

// ids de las filas donde algún campo contiene el texto
const idsOf = (rows, fields, term) => {
  const t = plain(term);
  return rows.filter((r) => fields.some((f) => plain(r[f]).includes(t))).map((r) => r.id);
};

module.exports = { plain, loadRows, idsOf };
