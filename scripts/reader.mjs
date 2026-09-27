/**
 * Necronolib — Reader (MVP-Kern).
 * Immersives Buch: geschlossenes Cover → Aufschlag → Doppelseiten aus
 * JournalEntryPages; Umblättern (Buttons, Klick aufs Buch, Pfeiltasten),
 * „Anzeigen“ (bei verbundenen Spielern öffnen + Umblättern synchron via Socket),
 * „Teilen“ (dauerhafter Zugriff, nur Leseansicht), GM-only-Seiten, CoC7-Anzeige + Mechanik-Delegation (Erstlesung/Nachschlagen).
 */
import { getLinkFlags, coverContext } from './schema.mjs';
import { visiblePages, buildSpreads, clampSpread, spreadLabel, spreadIndexOfPage } from '../src/reader/pagination.mjs';
import { sharedUserIds, playersMissingAccess } from '../src/share/access.mjs';
import { applyShare, openShareDialog } from './share.mjs';
import { isCoC7, bookStats, keeperHtml } from './coc7.mjs';
import { emitReaderEvent, isReaderEvent, isFromGM } from './sync.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Offene Reader je Journal-UUID (nur gerenderte; Eintrag fällt beim Schließen weg). */
const OPEN = new Map();

/** HTML-Escape für Attribut-/Textwerte, die wir selbst in Markup setzen. */
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

/** v13+: TextEditor liegt im Namespace; globaler Alias warnt in v14. */
const textEditor = () => foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;

export class NecronolibReader extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {JournalEntry} journal */
  constructor(journal) {
    super({});
    this.#journal = journal;
    // -1 = geschlossenes Cover (nur wenn Cover konfiguriert), sonst 0.
    this.#spread = this.#hasCover() ? -1 : 0;
  }

  #journal;
  #spread = -1;
  /** GM: Buch wird gerade den verbundenen Spielern angezeigt. */
  #showing = false;
  #following = false;
  /** Spieler: Reader wurde durch „Anzeigen“ geöffnet (wird bei „Nicht mehr anzeigen“ geschlossen). */
  openedByShow = false;

  static DEFAULT_OPTIONS = {
    classes: ['necronolib', 'nl-reader-app'],
    window: {
      title: 'NECRONOLIB.Reader.Title',
      icon: 'fa-solid fa-book-open',
      resizable: true
    },
    position: { width: 980, height: 700 },
    tag: 'section',
    actions: {
      turnPrev: NecronolibReader.#turnPrev,
      turnNext: NecronolibReader.#turnNext,
      toggleShow: NecronolibReader.#toggleShow,
      shareDialog: NecronolibReader.#shareDialog,
      toggleKeeperOnly: NecronolibReader.#toggleKeeperOnly,
      coc7InitialReading: NecronolibReader.#coc7InitialReading,
      coc7Reference: NecronolibReader.#coc7Reference
    }
  };

  static PARTS = {
    reader: {
      template: 'modules/necronolib/templates/reader.hbs',
      root: true
    }
  };

  /**
   * Reader für ein Journal öffnen (Singleton je Journal).
   * @param {JournalEntry} journal
   * @param {string} [pageId] optional direkt zu dieser Seite springen (z. B. Seitenlink)
   */
  static open(journal, pageId) {
    const key = journal?.uuid;
    if (!key) return null;
    let app = OPEN.get(key);
    if (!app) {
      app = new NecronolibReader(journal);
      OPEN.set(key, app);
    }
    if (pageId) app.gotoPage(pageId);
    app.render({ force: true });
    return app;
  }

  /** Zum Spread springen, der die Seite enthält (ohne Render). */
  gotoPage(pageId) {
    const index = spreadIndexOfPage(this.#spreads(), pageId);
    if (index >= 0) this.#spread = index;
  }

  /** Offener Reader für eine Journal-UUID (oder undefined). */
  static get(journalUuid) {
    return OPEN.get(journalUuid);
  }

  get journal() { return this.#journal; }

  /** Fenstertitel mit Buchnamen statt generischem Titel. */
  get title() {
    return `${game.i18n.localize(this.options.window.title)}: ${this.#journal.name}`;
  }

  #hasCover() {
    return Boolean(this.#journal.flags?.necronolib?.book);
  }

  #pages() {
    const user = game.user;
    return visiblePages(this.#journal.pages?.contents ?? [], {
      isGM: user.isGM,
      // Foundry-Seitenrechte respektieren: Spieler sehen nur Seiten mit OBSERVER.
      canView: (p) => (typeof p.testUserPermission === 'function' ? p.testUserPermission(user, 'OBSERVER') : true)
    });
  }

  #spreads() {
    return buildSpreads(this.#pages());
  }

  /** Klemmt inkl. geschlossenem Zustand (-1). */
  #clamp(index, spreads = this.#spreads()) {
    if (this.#hasCover() && index === -1) return -1;
    return clampSpread(index, spreads.length);
  }

  /** Socket-Follow: Sprung von außen (SL teilt). */
  follow(journalUuid, spread) {
    if (this.#journal.uuid !== journalUuid) return false;
    this.#spread = this.#clamp(spread);
    this.#following = true;
    this.render();
    return true;
  }

  /** Socket: SL zeigt das Buch nicht mehr an. Durch „Anzeigen“ geöffnete Reader schließen. */
  unfollow() {
    if (this.openedByShow) {
      this.close();
      return;
    }
    if (!this.#following) return;
    this.#following = false;
    this.render();
  }

  /** Eine Seite für die Anzeige aufbereiten (Rechte, Secrets, Seitentyp). */
  async #pageView(page, folio) {
    if (!page) return null;
    let html = '';
    switch (page.type) {
      case 'text':
        // Secrets nur für Seiten-Besitzer, wie im Foundry-Journal selbst.
        html = await textEditor().enrichHTML(page.text?.content ?? '', {
          secrets: Boolean(page.isOwner),
          relativeTo: page
        });
        break;
      case 'image':
        if (page.src) {
          const caption = page.image?.caption ? `<figcaption>${escapeHtml(page.image.caption)}</figcaption>` : '';
          html = `<figure class="nl-page-image"><img src="${escapeHtml(page.src)}" alt="${escapeHtml(page.name)}">${caption}</figure>`;
        }
        break;
      default:
        html = `<p class="nl-page-unsupported">${escapeHtml(game.i18n.localize('NECRONOLIB.Reader.Unsupported'))}</p>`;
    }
    const level = Math.min(Math.max(Number(page.title?.level) || 1, 1), 3);
    return {
      id: page.id,
      name: page.name,
      folio,
      html,
      showTitle: Boolean(page.title?.show) || page.type !== 'text',
      titleTag: `h${level}`,
      keeperOnly: Boolean(page.flags?.necronolib?.keeperOnly)
    };
  }

  async _prepareContext() {
    const spreads = this.#spreads();
    this.#spread = this.#clamp(this.#spread, spreads);
    const current = this.#spread >= 0 ? (spreads[this.#spread] ?? null) : null;
    const view = current
      ? {
        left: await this.#pageView(current.left, current.leftNo),
        right: await this.#pageView(current.right, current.rightNo)
      }
      : null;
    const link = getLinkFlags(this.#journal);
    const item = isCoC7(game) ? await fromUuidSafe(link.coc7BookUuid) : null;
    const coc7 = item ? bookStats(item) : null;
    const canAct = Boolean(coc7 && game.user.isGM && (item?.actor ?? item?.parent?.actor));
    const keeper = game.user.isGM ? keeperHtml(item) : '';
    return {
      journal: { id: this.#journal.id, uuid: this.#journal.uuid, name: this.#journal.name },
      cover: coverContext(this.#journal),
      isClosed: this.#spread === -1,
      current: view,
      label: this.#spread === -1
        ? game.i18n.localize('NECRONOLIB.Reader.Cover')
        : spreadLabel(current),
      isFirst: this.#spread === (this.#hasCover() ? -1 : 0),
      isLast: this.#spread >= spreads.length - 1,
      hasPages: spreads.length > 0,
      showing: this.#showing,
      sharedCount: game.user.isGM ? sharedUserIds(this.#journal).length : 0,
      sharedLabel: game.user.isGM
        ? game.i18n.format('NECRONOLIB.Reader.SharedCount', { count: sharedUserIds(this.#journal).length })
        : '',
      following: this.#following,
      isGM: game.user.isGM,
      coc7,
      coc7CanAct: canAct,
      keeperHtml: keeper ? await textEditor().enrichHTML(keeper, { secrets: true, relativeTo: item }) : ''
    };
  }

  /** Pfeiltasten/Bild-Tasten blättern (nicht in Eingabefeldern). */
  async _onFirstRender(context, options) {
    await super._onFirstRender?.(context, options);
    this.element.tabIndex = -1;
    this.element.addEventListener('keydown', (event) => {
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.key === 'Enter' || event.key === ' ') && event.target?.closest?.('.nl-book-open-target')) {
        event.preventDefault();
        this.#turn(+1);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); this.#turn(-1); }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); this.#turn(+1); }
    });
  }

  async _onClose(options) {
    await super._onClose?.(options);
    // Anzeigen beenden, damit Spieler nicht an einem geschlossenen Buch hängen.
    if (this.#showing && game.user.isGM) {
      this.#showing = false;
      emitReaderEvent({ action: 'show', journalId: this.#journal.id, journalUuid: this.#journal.uuid, show: false });
    }
    if (OPEN.get(this.#journal.uuid) === this) OPEN.delete(this.#journal.uuid);
  }

  #turn(delta) {
    const next = this.#clamp(this.#spread + delta);
    if (next === this.#spread) return;
    this.#spread = next;
    this.render();
    this.#broadcast();
  }

  #broadcast() {
    if (!game.user.isGM || !this.#showing) return;
    emitReaderEvent({
      action: 'goto',
      journalId: this.#journal.id,
      journalUuid: this.#journal.uuid,
      spread: this.#spread
    });
  }

  /* Aktionen (statisch, this = Instanz — verifiziertes v14-Idiom). */
  static #turnPrev() { this.#turn(-1); }
  static #turnNext() { this.#turn(+1); }

  /**
   * GM: „Anzeigen“ — öffnet das Buch bei allen verbundenen Spielern (Leseansicht, folgen dem Umblättern).
   * Fehlen verbundenen Spielern Leserechte, wird angeboten, das Buch mit ihnen zu teilen.
   */
  static async #toggleShow() {
    if (!game.user.isGM) return;
    const journal = this.#journal;
    if (!this.#showing) {
      const missing = playersMissingAccess(game.users, u => journal.testUserPermission(u, 'OBSERVER'));
      if (missing.length) {
        const grant = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize('NECRONOLIB.Reader.MissingAccessTitle') },
          content: `<p>${escapeHtml(game.i18n.format('NECRONOLIB.Reader.MissingAccess', { names: missing.map(u => u.name).join(', ') }))}</p>`,
          rejectClose: false
        });
        if (grant) await applyShare(journal, [...sharedUserIds(journal), ...missing.map(u => u.id)]);
      }
      if (!game.users.some(u => u.active && !u.isGM)) ui.notifications.info(game.i18n.localize('NECRONOLIB.Reader.ShowNoPlayers'));
    }
    this.#showing = !this.#showing;
    if (this.#showing) this.#following = false;
    emitReaderEvent({
      action: 'show',
      journalId: journal.id,
      journalUuid: journal.uuid,
      spread: this.#spread,
      show: this.#showing
    });
    ui.notifications.info(game.i18n.format(
      this.#showing ? 'NECRONOLIB.Reader.ShowOn' : 'NECRONOLIB.Reader.ShowOff',
      { journal: journal.name }
    ));
    this.render();
  }

  /** GM: „Teilen“ — Dialog mit Spieler-Checkboxen (dauerhafter Zugriff, nur Leseansicht). */
  static async #shareDialog() {
    if (!game.user.isGM) return;
    await openShareDialog(this.#journal);
    this.render();
  }

  /** GM: Seite als SL-only markieren/freigeben (flags.necronolib.keeperOnly). */
  static async #toggleKeeperOnly(_event, target) {
    if (!game.user.isGM) return;
    const page = this.#journal.pages?.get(target?.dataset?.pageId);
    if (!page) return;
    const next = !page.flags?.necronolib?.keeperOnly;
    await page.setFlag('necronolib', 'keeperOnly', next);
  }

  /** CoC7-Mechanik: Erstlesung — delegiert an das System (item.system). */
  static async #coc7InitialReading() {
    if (!game.user.isGM) return;
    const item = await this.#linkedItem();
    try {
      await item.system.attemptInitialReading();
    } catch (error) {
      console.error('necronolib | attemptInitialReading failed', error);
      ui.notifications.error(game.i18n.localize('NECRONOLIB.Coc7.ApiUnavailable'));
    }
  }

  /** CoC7-Mechanik: Mythos-Referenz (1W4) — delegiert an das System. */
  static async #coc7Reference() {
    if (!game.user.isGM) return;
    const item = await this.#linkedItem();
    try {
      await item.system.attemptReference();
    } catch (error) {
      console.error('necronolib | attemptReference failed', error);
      ui.notifications.error(game.i18n.localize('NECRONOLIB.Coc7.ApiUnavailable'));
    }
  }

  async #linkedItem() {
    const link = getLinkFlags(this.#journal);
    return fromUuidSafe(link.coc7BookUuid);
  }
}

/** fromUuid ohne Crash bei leerer/ungültiger UUID. */
async function fromUuidSafe(uuid) {
  if (!uuid) return null;
  try {
    return await fromUuid(uuid);
  } catch {
    return null;
  }
}

/**
 * Offene Reader nach Journal-/Seitenänderungen neu rendern (Hooks im Entry).
 * @param {JournalEntry|null|undefined} journal
 * @param {{deleted?: boolean}} opts
 */
export function refreshReaders(journal, { deleted = false } = {}) {
  const app = journal?.uuid ? OPEN.get(journal.uuid) : null;
  if (!app) return;
  if (deleted) app.close();
  else if (app.rendered) app.render();
}

/**
 * Wartet (max. timeoutMs) darauf, dass der eigene User Leserechte am Journal erhält.
 * Hintergrund: „Anzeigen“ kann Rechte unmittelbar vorher erteilen; das Ownership-Update
 * und das Socket-Event können in beliebiger Reihenfolge ankommen.
 */
function waitForAccess(journal, timeoutMs = 4000) {
  if (journal.testUserPermission(game.user, 'LIMITED')) return Promise.resolve(true);
  return new Promise((resolve) => {
    const hookId = Hooks.on('updateJournalEntry', (doc) => {
      if (doc.uuid !== journal.uuid || !doc.testUserPermission(game.user, 'LIMITED')) return;
      Hooks.off('updateJournalEntry', hookId);
      clearTimeout(timer);
      resolve(true);
    });
    const timer = setTimeout(() => { Hooks.off('updateJournalEntry', hookId); resolve(false); }, timeoutMs);
  });
}

/**
 * Socket-Dispatcher (im Entry registriert).
 * Akzeptiert nur Events von GM-Usern; „show: true“ öffnet den Reader bei Spielern
 * automatisch (sofern Leserechte), „show: false“ schließt ihn wieder bzw. beendet das Folgen.
 */
export async function handleSocket(data) {
  if (!isReaderEvent(data)) return;
  if (data.by === game.user?.id) return; // eigenes Echo ignorieren
  if (!isFromGM(data, game.users)) return;
  if (game.user.isGM) return; // andere GMs werden nicht gesteuert
  let app = OPEN.get(data.journalUuid);

  if (data.action === 'show' && data.show === false) {
    app?.unfollow();
    return;
  }

  if (!app && data.action === 'show' && data.show === true) {
    // Journal kann (bei frisch erteilten Rechten) noch nicht sichtbar sein → kurz warten.
    let journal = await fromUuidSafe(data.journalUuid);
    if (!journal) {
      await new Promise(r => setTimeout(r, 500));
      journal = await fromUuidSafe(data.journalUuid);
    }
    if (!journal || journal.documentName !== 'JournalEntry') return;
    if (!(await waitForAccess(journal))) return;
    app = NecronolibReader.open(journal);
    if (app) app.openedByShow = true;
  }
  if (!app) return;
  app.follow(data.journalUuid, data.spread ?? 0);
}
