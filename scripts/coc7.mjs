/**
 * Necronolib — CoC7-Brücke (Foundry-los testbar, defensiv).
 * Verknüpft Journals mit CoC7-`book`-Items; Mechanik bleibt im System.
 */

export const COC7_ID = 'CoC7';

/** CoC7-System aktiv? (game-Stub oder echtes game) */
export function isCoC7(gameRef) {
  return gameRef?.system?.id === COC7_ID;
}

/** Alle Buch-Items einer Item-Collection (World-Items). */
export function listBookItems(items) {
  return [...(items ?? [])].filter(i => i?.type === 'book');
}

/**
 * Normalisierte Statistik eines CoC7-Buch-Items für Reader-Chips.
 * @returns {object|null} null, wenn kein CoC7-Buch
 */
export function bookStats(item) {
  if (!item || item.type !== 'book') return null;
  const s = item.system ?? {};
  return {
    name: item.name ?? '',
    author: s.author ?? '',
    language: s.language ?? '',
    difficulty: s.difficultyLevel ?? 'regular',
    sanityLoss: s.sanityLoss ?? '0',
    mythosRating: s.mythosRating ?? 0,
    studyWeeks: s.study?.necessary ?? 0,
    cmi: s.gains?.cthulhuMythos?.initial ?? 0,
    cmf: s.gains?.cthulhuMythos?.final ?? 0,
    isMythos: Boolean(s.type?.mythos),
    isOccult: Boolean(s.type?.occult)
  };
}

/**
 * Liest description.keeper (SL-Text) als HTML, falls vorhanden.
 * @returns {string} '' wenn leer
 */
export function keeperHtml(item) {
  const html = item?.system?.description?.keeper;
  return typeof html === 'string' ? html.trim() : '';
}
