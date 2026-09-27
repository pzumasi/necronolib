/**
 * Necronolib — Entry-Point.
 * Phase 1: Cover-Atelier (lite). Phase 2: Reader. Phase 3: CoC7-Brücke (Anzeige).
 */
import { NecronolibAtelier } from './atelier.mjs';
import { NecronolibReader, handleSocket, refreshReaders } from './reader.mjs';
import { normalizeCover } from '../src/cover/model.mjs';
import { getBookFlags, getLinkFlags } from './schema.mjs';
import { isCoC7, listBookItems, bookStats } from './coc7.mjs';
import { onSocket } from './sync.mjs';
import { openShareDialog, installReaderOnlyGuard } from './share.mjs';
import { exportBook, importBookData, importFile, openImportDialog, createBookFromCoc7Item, addDirectoryButton } from './io.mjs';

const MODULE_ID = 'necronolib';

Hooks.once('init', () => {
  // v13+: loadTemplates liegt im Namespace; der globale Alias ist deprecated.
  const load = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  load([
    `modules/${MODULE_ID}/templates/partials/book.hbs`
  ]);

  game.necronolib = {
    /** Reader öffnen (SL + Spieler; Rechte via journal.testUserPermission). */
    openReader: (journal, pageId) => {
      if (!journal) return null;
      if (!journal.testUserPermission(game.user, 'LIMITED')) {
        ui.notifications.warn(game.i18n.localize('NECRONOLIB.Warn.NoReadPermission'));
        return null;
      }
      return NecronolibReader.open(journal, pageId);
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
    isCoC7: () => isCoC7(game),
    /* Teilen + Import/Export (GM; auch für Makros) */
    share: (journal) => openShareDialog(journal),
    exportBook,
    importBookData,
    importFile,
    openImportDialog,
    createBookFromCoc7Item
  };
});

/**
 * Kontextmenü im Journal-Verzeichnis: Buch lesen (alle) + Cover gestalten (GM).
 * v13+: Hook `get{DocumentName}ContextOptions(application, menuItems)`,
 * Einträge bekommen HTMLElements (kein jQuery). v14: Felder label/visible/onClick
 * (name/condition/callback sind deprecated).
 */
Hooks.on('getJournalEntryContextOptions', (_app, entries) => {
  const getJournal = (li) => game.journal.get(li?.dataset?.entryId ?? li?.dataset?.documentId);
  entries.push({
    label: 'NECRONOLIB.Context.ReadBook',
    icon: '<i class="fa-solid fa-book-open"></i>',
    visible: (li) => Boolean(getJournal(li)),
    onClick: (_event, li) => {
      const journal = getJournal(li);
      if (journal) game.necronolib.openReader(journal);
    }
  });
  const gmEntry = (label, icon, action) => entries.push({
    label,
    icon: `<i class="fa-solid ${icon}"></i>`,
    visible: (li) => game.user.isGM && Boolean(getJournal(li)),
    onClick: (_event, li) => {
      const journal = getJournal(li);
      if (journal) action(journal);
    }
  });
  gmEntry('NECRONOLIB.Context.DesignCover', 'fa-book', (j) => game.necronolib.openAtelier(j));
  gmEntry('NECRONOLIB.Context.ShareBook', 'fa-share-nodes', (j) => openShareDialog(j));
  gmEntry('NECRONOLIB.Context.ExportBook', 'fa-file-export', (j) => exportBook(j));
});

/* Import-Button im Journal-Verzeichnis (GM). v13+: html ist ein HTMLElement. */
Hooks.on('renderJournalDirectory', (_app, html) => addDirectoryButton(html));

/* Offene Reader aktuell halten, wenn sich Journal oder Seiten ändern. */
Hooks.on('updateJournalEntry', (journal) => refreshReaders(journal));
Hooks.on('deleteJournalEntry', (journal) => refreshReaders(journal, { deleted: true }));
for (const hook of ['createJournalEntryPage', 'updateJournalEntryPage', 'deleteJournalEntryPage']) {
  Hooks.on(hook, (page) => refreshReaders(page.parent));
}

Hooks.once('ready', () => {
  onSocket(handleSocket);
  // Geteilte Bücher öffnen sich bei Spielern nur in der Leseansicht.
  installReaderOnlyGuard((journal, pageId) => game.necronolib.openReader(journal, pageId));
  console.log(`${MODULE_ID} | ready — reader + atelier available via journal context menu`);
});
