/**
 * Necronolib — Reader-Pagination (pure, kein Foundry).
 * Seiten → Doppelseiten-Aufschlag (erste Seite rechts, wie ein echtes Buch).
 */

/**
 * Filtert Seiten nach Sichtbarkeit: keeperOnly-Seiten nur für GM.
 * @param {Array<object>} pages Seiten (raw-Objekte mit flags)
 * @param {{isGM?: boolean}} opts
 */
export function visiblePages(pages, { isGM = false } = {}) {
  return (pages ?? []).filter(p => isGM || !p?.flags?.necronolib?.keeperOnly);
}

/**
 * Baut Doppelseiten: Aufschlag beginnt rechts (Seite 1), danach Paare.
 * @param {Array<object>} pages sichtbare Seiten (Reihenfolge = Lesefolge)
 * @returns {Array<{left: object|null, right: object|null, leftNo: number|null, rightNo: number|null}>}
 */
export function buildSpreads(pages) {
  const list = pages ?? [];
  if (!list.length) return [];
  const no = (i) => (i === null ? null : i + 1);
  const spreads = [{ left: null, right: list[0], leftNo: null, rightNo: 1 }];
  for (let i = 1; i < list.length; i += 2) {
    const hasRight = i + 1 < list.length;
    spreads.push({
      left: list[i],
      right: hasRight ? list[i + 1] : null,
      leftNo: no(i),
      rightNo: hasRight ? i + 2 : null
    });
  }
  return spreads;
}

/** Klemmt einen Spread-Index auf gültigen Bereich. */
export function clampSpread(index, spreadCount) {
  const max = Math.max(0, (spreadCount ?? 0) - 1);
  return Math.max(0, Math.min(index ?? 0, max));
}

/**
 * Seitenlabel für die Statuszeile, z. B. „2–3" oder „4".
 */
export function spreadLabel(spread) {
  if (!spread) return '';
  const parts = [spread.leftNo, spread.rightNo].filter(n => n !== null);
  return parts.join('–');
}
