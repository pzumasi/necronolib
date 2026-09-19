/**
 * Necronolib — Flags-Schema:Persistenz auf JournalEntry.
 * Buchdaten leben unter flags.necronolib.book; Lesen normalisiert immer defensiv.
 */
import { SCHEMA_VERSION, normalizeCover } from '../src/cover/model.mjs';

export const FLAG_BOOK = 'flags.necronolib.book';
export const FLAG_VERSION = 'flags.necronolib.version';

/**
 * Normalisiertes Cover eines Journals (immer vollständiges Schema).
 * @param {JournalEntry|null|undefined} journal
 */
export function getBookFlags(journal) {
  return normalizeCover(journal?.flags?.necronolib?.book ?? {});
}

/**
 * Speichert ein Cover am Journal (Foundry-Rechte werden von journal.update durchgesetzt).
 * @param {JournalEntry} journal
 * @param {object} cover raw cover
 * @returns {Promise<object>} das gespeicherte, normalisierte Cover
 */
export async function setBookFlags(journal, cover) {
  const book = normalizeCover(cover);
  await journal.update({ [FLAG_BOOK]: book, [FLAG_VERSION]: SCHEMA_VERSION });
  return book;
}
