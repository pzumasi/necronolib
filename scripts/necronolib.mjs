/**
 * Necronolib — Entry-Point.
 * Phase 1: Cover-Atelier (lite) für JournalEntries.
 */
import { NecronolibAtelier } from './atelier.mjs';
import { normalizeCover } from '../src/cover/model.mjs';
import { getBookFlags } from './schema.mjs';

const MODULE_ID = 'necronolib';

Hooks.once('init', () => {
  loadTemplates([
    `modules/${MODULE_ID}/templates/partials/book.hbs`
  ]);

  game.necronolib = {
    openAtelier: (journal) => {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize('NECRONOLIB.Warn.GmOnly'));
        return null;
      }
      return NecronolibAtelier.open(journal);
    },
    getBookFlags,
    normalizeCover
  };
});

/** Kontextmenü-Eintrag im Journal-Sidebar-Verzeichnis (GM). */
Hooks.on('getJournalEntryContext', (html, entries) => {
  if (!game.user.isGM) return;
  entries.push({
    name: game.i18n.localize('NECRONOLIB.Context.DesignCover'),
    icon: '<i class="fa-solid fa-book"></i>',
    callback: (li) => {
      const journal = game.journal.get(li.dataset.entryId ?? li.dataset.documentId);
      if (journal) NecronolibAtelier.open(journal);
    },
    condition: (li) => Boolean(game.journal.get(li.dataset.entryId ?? li.dataset.documentId))
  });
});

Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | ready — cover atelier (lite) available via journal context menu`);
});
