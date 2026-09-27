/**
 * Necronolib — Teilen & Leseansicht-Zwang (pure, kein Foundry).
 * „Teilen“ gibt ausgewählten Spielern dauerhaft Leserechte (OBSERVER) und merkt
 * sich, wem wir sie gegeben haben (flags.necronolib.share.users). Diese Spieler
 * öffnen das Buch nur in der Leseansicht (kein Journal-Sheet).
 */

/** Foundry CONST.DOCUMENT_OWNERSHIP_LEVELS (stabil seit v10). */
export const LEVELS = Object.freeze({ NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 });

/** Liste der User-IDs, mit denen das Buch per „Teilen“ geteilt ist. */
export function sharedUserIds(journal) {
  const users = journal?.flags?.necronolib?.share?.users;
  return Array.isArray(users) ? users.filter(u => typeof u === 'string' && u) : [];
}

/**
 * Neue Ownership + Share-Liste berechnen.
 * - ausgewählte Spieler: mindestens OBSERVER (höhere Rechte bleiben)
 * - früher von uns geteilte, jetzt abgewählte Spieler: Eintrag entfernen
 *   (fällt auf `default` zurück) — nur wenn wir ihn nicht über OBSERVER hinaus kennen
 * - alle anderen Einträge bleiben unangetastet
 * @param {object} ownership aktuelle journal.ownership
 * @param {string[]} selected ausgewählte Spieler-IDs
 * @param {string[]} previous bisher geteilte IDs (sharedUserIds)
 * @returns {{ownership: object, users: string[], changed: boolean}}
 */
export function computeShare(ownership, selected, previous = []) {
  const next = { ...(ownership ?? {}) };
  const sel = [...new Set(selected ?? [])];
  for (const id of sel) {
    if (!(Number(next[id]) >= LEVELS.OBSERVER)) next[id] = LEVELS.OBSERVER;
  }
  for (const id of previous ?? []) {
    if (!sel.includes(id) && Number(next[id]) <= LEVELS.OBSERVER) delete next[id];
  }
  const changed = JSON.stringify(sortKeys(next)) !== JSON.stringify(sortKeys(ownership ?? {}))
    || JSON.stringify([...sel].sort()) !== JSON.stringify([...(previous ?? [])].sort());
  return { ownership: next, users: sel, changed };
}

const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Muss dieser User das Buch in der Leseansicht öffnen (statt im Journal-Sheet)?
 * Nur Spieler, mit denen per „Teilen“ geteilt wurde und die nicht Besitzer sind.
 * @param {{flags?: object, ownership?: object}} journal
 * @param {{id: string, isGM?: boolean}} user
 */
export function isReaderOnlyFor(journal, user) {
  if (!journal || !user || user.isGM) return false;
  if (!sharedUserIds(journal).includes(user.id)) return false;
  const level = Number(journal.ownership?.[user.id] ?? journal.ownership?.default ?? 0);
  return level < LEVELS.OWNER;
}

/**
 * Verbundene Spieler, denen für „Anzeigen“ Leserechte fehlen.
 * @param {Array<{id: string, isGM?: boolean, active?: boolean}>} users
 * @param {(user: object) => boolean} canRead z. B. u => journal.testUserPermission(u, 'OBSERVER')
 */
export function playersMissingAccess(users, canRead) {
  return [...(users ?? [])].filter(u => u && u.active && !u.isGM && !canRead(u));
}
