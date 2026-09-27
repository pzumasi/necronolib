/**
 * Necronolib — Reader-Pagination (pure, kein Foundry).
 * Seiten → Doppelseiten-Aufschlag (erste Seite rechts, wie ein echtes Buch).
 */

/**
 * Filtert Seiten nach Sichtbarkeit und sortiert sie in Lesefolge.
 * - keeperOnly-Seiten nur für GM
 * - optional `canView(page)`: Foundry-Seitenrechte (OBSERVER), damit Spieler
 *   keine Seiten sehen, die ihnen im Journal selbst verborgen wären
 * - Reihenfolge nach `page.sort` (Foundry-Collections sind nicht sortiert)
 * @param {Array<object>} pages Seiten (raw-Objekte mit flags)
 * @param {{isGM?: boolean, canView?: (page: object) => boolean}} opts
 */
export function visiblePages(pages, { isGM = false, canView } = {}) {
  return [...(pages ?? [])]
    .filter(p => p && (isGM || !p.flags?.necronolib?.keeperOnly))
    .filter(p => (typeof canView === 'function' ? canView(p) : true))
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (sortKey(a.p) - sortKey(b.p)) || (a.i - b.i))
    .map(({ p }) => p);
}

const sortKey = (page) => (Number.isFinite(page?.sort) ? page.sort : 0);

/**
 * Baut Doppelseiten: Aufschlag beginnt rechts (Seite 1), danach Paare.
 * @param {Array<object>} pages sichtbare Seiten (Reihenfolge = Lesefolge)
 * @returns {Array<{left: object|null, right: object|null, leftNo: number|null, rightNo: number|null}>}
 */
export function buildSpreads(pages) {
  const list = pages ?? [];
  if (!list.length) return [];
  const spreads = [{ left: null, right: list[0], leftNo: null, rightNo: 1 }];
  for (let i = 1; i < list.length; i += 2) {
    const hasRight = i + 1 < list.length;
    spreads.push({
      left: list[i],
      right: hasRight ? list[i + 1] : null,
      leftNo: i + 1,
      rightNo: hasRight ? i + 2 : null
    });
  }
  return spreads;
}

/**
 * Klemmt einen Spread-Index auf gültigen Bereich.
 * Nicht-numerische/nicht-endliche Werte (z. B. aus Socket-Payloads) → 0.
 */
export function clampSpread(index, spreadCount) {
  const max = Math.max(0, (Number.isFinite(spreadCount) ? spreadCount : 0) - 1);
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(i, max));
}

/**
 * Seitenlabel für die Statuszeile, z. B. „2–3" oder „4".
 */
export function spreadLabel(spread) {
  if (!spread) return '';
  const parts = [spread.leftNo, spread.rightNo].filter(n => n !== null);
  return parts.join('–');
}

/**
 * Index des Spreads, der eine bestimmte Seite (per id) enthält, sonst -1.
 * Nützlich für „an Seite X springen" (z. B. Inhaltsverzeichnis).
 */
export function spreadIndexOfPage(spreads, pageId) {
  return (spreads ?? []).findIndex(s => s.left?.id === pageId || s.right?.id === pageId);
}
