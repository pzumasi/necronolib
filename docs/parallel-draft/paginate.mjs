/**
 * Necronolib — Pagination (pure, kein Foundry).
 * JournalEntryPages → Doppelseiten-Spreads mit Cover-Ansicht.
 */

/**
 * @typedef {Object} Spread
 * @property {'cover'|'spread'} kind
 * @property {object|null} left   linke Seite (JournalEntryPage-Stub oder null)
 * @property {object|null} right  rechte Seite
 * @property {number} index       Spread-Index (0 = Cover)
 * @property {number} pageNumberLeft  1-basierte Seitenzahl links (0 wenn keine)
 * @property {number} pageNumberRight 1-basierte Seitenzahl rechts (0 wenn keine)
 */

/**
 * Seiten für eine Rolle filtern: keeperOnly-Seiten sehen nur GMs.
 * Erwartet Page-Stubs mit { id, keeperOnly } (vorab extrahiert).
 * @param {Array<{id:string, keeperOnly?:boolean}>} pages
 * @param {boolean} isGM
 */
export function visiblePages(pages, isGM) {
  if (!Array.isArray(pages)) return [];
  return isGM ? pages.slice() : pages.filter((p) => !p?.keeperOnly);
}

/**
 * Baut die Spread-Folge: Cover + Doppelseiten [0|1], [2|3], …
 * @param {Array<object>} pages bereits rollengefilterte Seiten
 * @param {{includeCover?: boolean}} [options]
 * @returns {Spread[]}
 */
export function buildSpreads(pages, { includeCover = true } = {}) {
  const list = Array.isArray(pages) ? pages : [];
  const spreads = [];
  if (includeCover) spreads.push({ kind: 'cover', left: null, right: null, index: 0, pageNumberLeft: 0, pageNumberRight: 0 });
  for (let i = 0; i < list.length; i += 2) {
    const left = list[i] ?? null;
    const right = list[i + 1] ?? null;
    const n = includeCover ? i + 1 : i; // 1-basiert, Cover zählt nicht als Seite
    spreads.push({
      kind: 'spread',
      left,
      right,
      index: spreads.length,
      pageNumberLeft: left ? n : 0,
      pageNumberRight: right ? n + 1 : 0
    });
  }
  return spreads;
}

/** Anzahl Blätter (Doppelseiten) ohne Cover. */
export function sheetCount(spreads) {
  return (spreads ?? []).filter((s) => s.kind === 'spread').length;
}

/**
 * Navigations-Helper: nächster/vorheriger Spread-Index mit Grenzen.
 * @param {Spread[]} spreads
 * @param {number} current
 */
export function navigate(spreads, current, direction) {
  const max = (spreads ?? []).length - 1;
  if (max < 0) return { index: 0, changed: false, atStart: true, atEnd: true };
  const next = Math.max(0, Math.min(max, (current ?? 0) + direction));
  return { index: next, changed: next !== current, atStart: next === 0, atEnd: next === max };
}

/**
 * Zur Seite mit gegebener pageNumber springen (z. B. nach Filterwechsel).
 * @returns {number} Spread-Index, -1 wenn nicht gefunden
 */
export function spreadForPage(spreads, pageNumber) {
  return (spreads ?? []).findIndex(
    (s) => s.pageNumberLeft === pageNumber || s.pageNumberRight === pageNumber
  );
}

/**
 * Socket-Payload validieren (defensiv gegen fremde/manipulierte Events).
 * @param {unknown} payload
 * @returns {payload is {msgType:'turn'|'open', journalUuid:string, spread?:number, by?:string}}
 */
export function isValidSocketPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.msgType !== 'turn' && payload.msgType !== 'open') return false;
  if (typeof payload.journalUuid !== 'string' || !payload.journalUuid.startsWith('JournalEntry.')) return false;
  if (payload.msgType === 'turn' && !Number.isInteger(payload.spread)) return false;
  return true;
}
