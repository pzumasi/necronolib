/**
 * Necronolib — Entry-Point.
 * Phase 1: Cover-Atelier (lite). Phase 2: Reader. Phase 3: CoC7-Brücke (Anzeige).
 */
import { NecronolibAtelier } from './atelier.mjs';
import { NecronolibReader, handleSocket } from './reader.mjs';
import { normalizeCover } from '../src/cover/model.mjs';
import { getBookFlags, getLinkFlags } from './schema.mjs';
import { isCoC7, listBookItems, bookStats } from './coc7.mjs';
import { onSocket } from './sync.mjs';

const MODULE_ID = 'necronolib';

Hooks.once('init', () => {
  loadTemplates([
    `modules/${MODULE_ID}/templates/partials/book.hbs`
  ]);

  game.necronolib = {
    /** Reader öffnen (SL + Spieler; Rechte via journal.testUserPermission). */
    openReader: (journal) => {
      if (!journal) return null;
      if (!journal.testUserPermission(game.user, 'LIMITED')) {
        ui.notifications.warn(game.i18n.localize('NECRONOLIB.Warn.NoReadPermission'));
        return null;
      }
      return NecronolibReader.open(journal);
    },
    openAtelier: (journal) => {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize('NECRONOLIB.Warn.GmOnly'));
        return null;
      }
      return NecronolibAtelier.open(journal);
    },
    getBookFlags,
    getLinkFlags,
    normalizeCover,
    listBookItems: (collection) => listBookItems(collection ?? game.items),
    bookStats,
    isCoC7: () => isCoC7(game)
  };
});

/** Kontextmenü: Buch lesen (alle) + Cover gestalten (GM). */
Hooks.on('getJournalEntryContext', (html, entries) => {
  const getJournal = (li) => game.journal.get(li.dataset.entryId ?? li.dataset.documentId);
  entries.push({
    name: game.i18n.localize('NECRONOLIB.Context.ReadBook'),
    icon: '<i class="fa-solid fa-book-open"></i>',
    callback: (li) => {
      const journal = getJournal(li);
      if (journal) game.necronolib.openReader(journal);
    },
    condition: (li) => Boolean(getJournal(li))
  });
  if (!game.user.isGM) return;
  entries.push({
    name: game.i18n.localize('NECRONOLIB.Context.DesignCover'),
    icon: '<i class="fa-solid fa-book"></i>',
    callback: (li) => {
      const journal = getJournal(li);
      if (journal) NecronolibAtelier.open(journal);
    },
    condition: (li) => Boolean(getJournal(li))
  });
});

Hooks.once('ready', () => {
  onSocket(handleSocket);
  console.log(`${MODULE_ID} | ready — reader + atelier available via journal context menu`);
});
