/**
 * Necronolib — Flags-Schema: Persistenz auf JournalEntry.
 * Buchdaten leben unter flags.necronolib.book, Item-Verknüpfung unter flags.necronolib.link.
 * Lesen normalisiert immer defensiv.
 */
import { SCHEMA_VERSION, normalizeCover, coverVars, runesFor } from '../src/cover/model.mjs';

export const FLAG_BOOK = 'flags.necronolib.book';
export const FLAG_VERSION = 'flags.necronolib.version';
export const FLAG_LINK = 'flags.necronolib.link';

/**
 * Normalisiertes Cover eines Journals (immer vollständiges Schema).
 * @param {JournalEntry|null|undefined} journal
 */
export function getBookFlags(journal) {
  return normalizeCover(journal?.flags?.necronolib?.book ?? {});
}

/**
 * Speichert ein Cover am Journal (Foundry-Rechte-Rechte werden von journal.update durchgesetzt).
 * @param {JournalEntry} journal
 * @param {object} cover raw cover
 * @returns {Promise<object>} das gespeicherte, normalisierte Cover
 */
export async function setBookFlags(journal, cover) {
  const book = normalizeCover(cover);
  await journal.update({ [FLAG_BOOK]: book, [FLAG_VERSION]: SCHEMA_VERSION });
  return book;
}

/**
 * CoC7-Verknüpfung lesen: { coc7BookUuid }.
 */
export function getLinkFlags(journal) {
  const link = journal?.flags?.necronolib?.link;
  const uuid = link && typeof link.coc7BookUuid === 'string' ? link.coc7BookUuid.trim() : '';
  return { coc7BookUuid: uuid };
}

/**
 * CoC7-Verknüpfung speichern (uuid '' löst die Verknüpfung).
 */
export async function setLinkFlags(journal, link) {
  const clean = { coc7BookUuid: String(link?.coc7BookUuid ?? '').trim() };
  await journal.update({ [FLAG_LINK]: clean });
  return clean;
}

/**
 * Template-Kontext für das Cover-Partial (Vars-String + ggf. Runen).
 * Nutzt game.i18n nur, wenn game existiert (Node-Tests).
 */
export function coverContext(journal) {
  const cover = getBookFlags(journal);
  const vars = Object.entries(coverVars(cover)).map(([k, v]) => `${k}: ${v}`).join('; ');
  const showRunes = !cover.title.text;
  const runesTitle = showRunes && (typeof game !== 'undefined')
    ? game.i18n.localize('NECRONOLIB.Atelier.RunesHint')
    : '';
  return {
    cover,
    vars,
    runes: showRunes ? runesFor(journal?.uuid ?? journal?.id ?? 'necronolib') : '',
    runesTitle
  };
}
