/**
 * Necronolib — Reader (MVP-Kern).
 * Immersives Buch: geschlossenes Cover → Aufschlag → Doppelseiten aus
 * JournalEntryPages; Umblättern, geteiltes Lesen via Socket, GM-only-Seiten,
 * CoC7-Anzeige + Mechanik-Delegation (Erstlesung/Nachschlagen).
 */
import { getBookFlags, getLinkFlags, coverContext } from './schema.mjs';
import { visiblePages, buildSpreads, clampSpread, spreadLabel } from '../src/reader/pagination.mjs';
import { isCoC7, bookStats, keeperHtml } from './coc7.mjs';
import { emitReaderEvent, isReaderEvent } from './sync.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Offene Reader je Journal. */
const OPEN = new Map();

export class NecronolibReader extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {JournalEntry} journal */
  constructor(journal) {
    super({});
    this.#journal = journal;
    // -1 = geschlossenes Cover (nur wenn Cover konfiguriert), sonst 0.
    this.#spread = this.#hasCover() ? -1 : 0;
    this.#sharing = false;
    this.#following = false;
  }

  #journal;
  #spread = -1;
  #sharing = false;
  #following = false;

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
      toggleShare: NecronolibReader.#toggleShare,
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

  static open(journal) {
    const key = journal?.uuid ?? String(journal?.id);
    if (!key) return null;
    let app = OPEN.get(key);
    if (!app) {
      app = new NecronolibReader(journal);
      OPEN.set(key, app);
      app.render(true);
    } else {
      app.render(true);
    }
    return app;
  }

  #hasCover() {
    return Boolean(this.#journal.flags?.necronolib?.book);
  }

  #pages() {
    return visiblePages(this.#journal.pages?.contents ?? [], { isGM: game.user.isGM });
  }

  #spreads() {
    return buildSpreads(this.#pages());
  }

  /** Klemmt inkl. geschlossenem Zustand (-1). */
  #clamp(index) {
    if (this.#hasCover() && index === -1) return -1;
    return clampSpread(index, this.#spreads().length);
  }

  /** Socket-Follow: Sprung von außen (SL teilt). */
  follow(journalUuid, spread) {
    if (this.#journal.uuid !== journalUuid) return false;
    this.#spread = this.#clamp(spread);
    this.#following = true;
    this.render();
    return true;
  }

  async _prepareContext() {
    const spreads = this.#spreads();
    this.#spread = this.#clamp(this.#spread);
    const current = this.#spread >= 0 ? (spreads[this.#spread] ?? null) : null;
    const link = getLinkFlags(this.#journal);
    const item = isCoC7(game) ? await fromUuidSafe(link.coc7BookUuid) : null;
    const coc7 = item ? bookStats(item) : null;
    const canAct = Boolean(coc7 && game.user.isGM && (item?.actor ?? item?.parent?.actor));
    return {
      journal: { id: this.#journal.id, uuid: this.#journal.uuid, name: this.#journal.name },
      cover: coverContext(this.#journal),
      isClosed: this.#spread === -1,
      current,
      label: this.#spread === -1
        ? game.i18n.localize('NECRONOLIB.Reader.Cover')
        : spreadLabel(current),
      isFirst: this.#spread === (this.#hasCover() ? -1 : 0),
      isLast: this.#spread >= spreads.length - 1,
      hasPages: spreads.length > 0,
      sharing: this.#sharing,
      following: this.#following,
      isGM: game.user.isGM,
      coc7,
      coc7CanAct: canAct,
      keeperHtml: game.user.isGM ? keeperHtml(item) : ''
    };
  }

  #turn(delta) {
    const next = this.#clamp(this.#spread + delta);
    if (next === this.#spread) return;
    this.#spread = next;
    this.render();
    this.#broadcast();
  }

  #broadcast() {
    if (!game.user.isGM || !this.#sharing) return;
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

  static #toggleShare() {
    if (!game.user.isGM) return;
    this.#sharing = !this.#sharing;
    if (this.#sharing) this.#following = false;
    emitReaderEvent({
      action: 'share',
      journalId: this.#journal.id,
      journalUuid: this.#journal.uuid,
      spread: this.#spread,
      share: this.#sharing
    });
    ui.notifications.info(game.i18n.format(
      this.#sharing ? 'NECRONOLIB.Reader.SharedOn' : 'NECRONOLIB.Reader.SharedOff',
      { journal: this.#journal.name }
    ));
    this.render();
  }

  /** CoC7-Mechanik: Erstlesung — delegiert an das System (item.system). */
  static async #coc7InitialReading() {
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

/** Socket-Dispatcher (im Entry registriert). */
export function handleSocket(data) {
  if (!isReaderEvent(data)) return;
  if (data.by === game.user?.id) return; // eigenes Echo ignorieren
  const app = OPEN.get(data.journalUuid);
  if (!app) return;
  app.follow(data.journalUuid, data.spread ?? 0);
}
