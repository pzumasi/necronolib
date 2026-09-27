/**
 * Necronolib — „Teilen“ (dauerhafter Zugriff) + Leseansicht-Zwang für geteilte Bücher.
 * Pure Logik: src/share/access.mjs. Hier nur Foundry-Anbindung (Dialog, Update, Sheet-Umleitung).
 */
import { computeShare, sharedUserIds, isReaderOnlyFor } from '../src/share/access.mjs';

const { DialogV2 } = foundry.applications.api;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

/** Alle Spieler-Accounts (keine GMs). */
export const playerUsers = () => game.users.filter(u => !u.isGM);

/**
 * Freigabe setzen: ausgewählte Spieler bekommen OBSERVER, abgewählte (früher geteilte) verlieren sie.
 * @returns {Promise<string[]>} neue Liste geteilter User-IDs
 */
export async function applyShare(journal, userIds) {
  if (!game.user.isGM) return sharedUserIds(journal);
  const previous = sharedUserIds(journal);
  const { ownership, users, changed } = computeShare(journal.ownership, userIds, previous);
  if (!changed) return users;
  // recursive:false ersetzt das ownership-Objekt komplett (nötig, um Einträge zu entfernen).
  await journal.update({ ownership }, { diff: false, recursive: false });
  await journal.setFlag('necronolib', 'share', { users });
  return users;
}

/** Dialog mit Checkboxen (Default: alle, bzw. aktueller Stand). */
export async function openShareDialog(journal) {
  if (!game.user.isGM) return null;
  const players = playerUsers();
  if (!players.length) {
    ui.notifications.warn(game.i18n.localize('NECRONOLIB.Reader.ShareNoPlayers'));
    return null;
  }
  const hasShareFlag = Boolean(journal.flags?.necronolib?.share);
  const current = new Set(sharedUserIds(journal));
  const rows = players.map(u => {
    const checked = hasShareFlag ? current.has(u.id) : true;
    const online = u.active ? ' <i class="fa-solid fa-circle nl-online" title="online"></i>' : '';
    return `<label class="nl-share-row"><input type="checkbox" name="users" value="${escapeHtml(u.id)}" ${checked ? 'checked' : ''}>
      <span>${escapeHtml(u.name)}</span>${online}</label>`;
  }).join('');
  const content = `<p class="nl-share-hint">${escapeHtml(game.i18n.localize('NECRONOLIB.Reader.ShareDialogHint'))}</p>
    <div class="nl-share-list">${rows}</div>`;

  const selected = await DialogV2.wait({
    window: { title: game.i18n.format('NECRONOLIB.Reader.ShareDialogTitle', { journal: journal.name }), icon: 'fa-solid fa-share-nodes' },
    classes: ['necronolib', 'nl-share-dialog'],
    content,
    buttons: [{
      action: 'apply',
      label: game.i18n.localize('NECRONOLIB.Reader.ShareApply'),
      icon: 'fa-solid fa-check',
      default: true,
      callback: (_event, button) => [...button.form.querySelectorAll('input[name="users"]:checked')].map(i => i.value)
    }],
    rejectClose: false
  });
  if (!Array.isArray(selected)) return null;
  const users = await applyShare(journal, selected);
  ui.notifications.info(game.i18n.format('NECRONOLIB.Reader.ShareSaved', { journal: journal.name, count: users.length }));
  return users;
}

/**
 * Geteilte Bücher öffnen sich bei Spielern nur in der Leseansicht:
 * JournalEntrySheet/-PageSheet.render wird für diese Fälle auf den Reader umgeleitet
 * (deckt Verzeichnis-Klick, @UUID-Links und Seitenlinks ab).
 * Hinweis: UX-Sperre, keine Sicherheitsgrenze — Leserechte (OBSERVER) hat der Spieler ja.
 * @param {(journal: JournalEntry, pageId?: string) => void} openReader
 */
export function installReaderOnlyGuard(openReader) {
  const sheets = foundry.applications?.sheets?.journal ?? {};
  const patch = (Cls, journalOf) => {
    if (!Cls?.prototype?.render || Cls.prototype.render.__necronolib) return;
    const original = Cls.prototype.render;
    const wrapped = function (...args) {
      const journal = journalOf(this.document);
      if (journal && isReaderOnlyFor(journal, game.user)) {
        openReader(journal, this.document?.documentName === 'JournalEntryPage' ? this.document.id : undefined);
        return Promise.resolve(this);
      }
      return original.apply(this, args);
    };
    wrapped.__necronolib = true;
    Cls.prototype.render = wrapped;
  };
  patch(sheets.JournalEntrySheet, doc => doc);
  patch(sheets.JournalEntryPageSheet, doc => doc?.parent);
}
