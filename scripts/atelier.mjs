/**
 * Necronolib — Cover-Atelier (lite).
 * AppV2-Fenster: Live-Vorschau + Feldeinstellungen, Speichern in flags.necronolib.
 * Verwendet nur verifizierte v14-Idiome: actions/data-action, this.element, this.render().
 */
import { getBookFlags, getLinkFlags, saveBook } from './schema.mjs';
import { isCoC7, listBookItems } from './coc7.mjs';
import {
  normalizeCover, defaultCover, coverVars, runesFor,
  COVER_MATERIALS, WEAR_LEVELS, TITLE_EFFECTS, TITLE_FONTS, TITLE_POSITIONS, CLASP_STYLES, THICKNESSES, PALETTES
} from '../src/cover/model.mjs';
import { applyCover } from '../src/cover/render.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Offene Instanzen je Journal (mehrfach öffnen vermeiden; Eintrag fällt beim Schließen weg). */
const OPEN = new Map();

export class NecronolibAtelier extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {JournalEntry} journal */
  constructor(journal) {
    super({});
    this.#journal = journal;
    this.#cover = getBookFlags(journal);
    this.#link = getLinkFlags(journal);
  }

  #journal;
  #cover;
  #link;

  static DEFAULT_OPTIONS = {
    classes: ['necronolib', 'nl-atelier-app'],
    window: {
      title: 'NECRONOLIB.Atelier.Title',
      icon: 'fa-solid fa-book',
      resizable: true
    },
    position: { width: 720, height: 560 },
    tag: 'section',
    actions: {
      save: NecronolibAtelier.#onSave,
      reset: NecronolibAtelier.#onReset,
      revert: NecronolibAtelier.#onRevert
    }
  };

  static PARTS = {
    atelier: {
      template: 'modules/necronolib/templates/atelier.hbs',
      root: true,
      scrollable: ['.nl-controls']
    }
  };

  /** Atelier für ein Journal öffnen (Singleton je Journal). */
  static open(journal) {
    const key = journal?.uuid;
    if (!key) return null;
    let app = OPEN.get(key);
    if (!app) {
      app = new NecronolibAtelier(journal);
      OPEN.set(key, app);
    }
    app.render({ force: true });
    return app;
  }

  /** Fenstertitel mit Journalnamen. */
  get title() {
    return `${game.i18n.localize(this.options.window.title)}: ${this.#journal.name}`;
  }

  async _onClose(options) {
    await super._onClose?.(options);
    if (OPEN.get(this.#journal.uuid) === this) OPEN.delete(this.#journal.uuid);
  }

  /** Nach jedem Render (auch dem ersten) Feld-Listener setzen. */
  async _onRender(context, options) {
    await super._onRender?.(context, options);
    this.#wire();
  }

  async _prepareContext() {
    const vars = Object.entries(coverVars(this.#cover)).map(([k, v]) => `${k}: ${v}`).join('; ');
    const coc7Books = isCoC7(game)
      ? listBookItems(game.items).map(i => ({ uuid: i.uuid, name: i.name, selected: i.uuid === this.#link.coc7BookUuid }))
      : null;
    // Bestehende Verknüpfung auf ein Actor-Item (nicht in game.items) weiter anzeigen,
    // sonst würde Speichern sie stillschweigend lösen.
    const linked = this.#link.coc7BookUuid;
    if (coc7Books && linked && !coc7Books.some(b => b.uuid === linked)) {
      let item = null;
      try { item = fromUuidSync(linked); } catch { /* Compendium/ungültig */ }
      const name = item ? `${item.name}${item.actor ? ` (${item.actor.name})` : ''}` : linked;
      coc7Books.unshift({ uuid: linked, name, selected: true });
    }
    return {
      journal: { id: this.#journal.id, name: this.#journal.name },
      cover: this.#cover,
      vars,
      link: this.#link,
      // Runen immer mitrendern: applyCover schaltet Titel ↔ Runen live um.
      runes: runesFor(this.#journal.uuid),
      runesTitle: game.i18n.localize('NECRONOLIB.Atelier.RunesHint'),
      coc7Active: isCoC7(game),
      coc7Books,
      materialOptions: NecronolibAtelier.#options('Material', COVER_MATERIALS, this.#cover.material),
      paletteOptions: NecronolibAtelier.#paletteOptions(this.#cover),
      wearOptions: NecronolibAtelier.#options('Wear', WEAR_LEVELS, this.#cover.wear),
      thicknessOptions: NecronolibAtelier.#options('Thickness', THICKNESSES, this.#cover.thickness),
      claspOptions: NecronolibAtelier.#options('Clasps', CLASP_STYLES, this.#cover.clasps),
      fontOptions: NecronolibAtelier.#options('TitleFont', TITLE_FONTS, this.#cover.title.font),
      effectOptions: NecronolibAtelier.#options('TitleEffect', TITLE_EFFECTS, this.#cover.title.effect),
      positionOptions: NecronolibAtelier.#options('TitlePosition', TITLE_POSITIONS, this.#cover.title.position)
    };
  }

  /** Change-/Input-Listener auf alle Felder setzen (öffentl. API, kein privates Framework-Event). */
  #wire() {
    for (const field of this.element.querySelectorAll('[data-nl-field]')) {
      // Textfelder live beim Tippen, Selects beim Wechsel.
      const eventName = field.tagName === 'INPUT' ? 'input' : 'change';
      field.addEventListener(eventName, () => {
        const name = field.getAttribute('name');
        if (!name) return;
        this.#setField(name, field.value);
        if (field.dataset.nlRerender === '1') {
          // Material-Wechsel: andere Palettenliste + volle Optionen-Kette neu rendern.
          this.render();
        } else {
          // Live-Vorschau ohne Re-Render (Fokus/Scroll bleibt).
          applyCover(this.element, this.#cover);
        }
      });
    }
    // Enter im Titelfeld darf das Formular nicht absenden.
    this.element.querySelector('form.nl-controls')?.addEventListener('submit', (e) => e.preventDefault());
  }

  #setField(name, value) {
    switch (name) {
      case 'material': {
        this.#cover = normalizeCover({ ...this.#cover, material: value });
        break;
      }
      case 'palette': this.#cover.palette = value; break;
      case 'wear': this.#cover.wear = value; break;
      case 'thickness': this.#cover.thickness = value; break;
      case 'clasps': this.#cover.clasps = value; break;
      case 'title.text': this.#cover.title.text = value.trim().slice(0, 120); break;
      case 'title.font': this.#cover.title.font = value; break;
      case 'title.effect': this.#cover.title.effect = value; break;
      case 'title.position': this.#cover.title.position = value; break;
      case 'coc7BookUuid': this.#link.coc7BookUuid = value; break;
    }
  }

  /** Select-Optionen inkl. selected-Flag (kein Handlebars-Helper nötig; `selected` fehlt in v14). */
  static #options(prefix, ids, current) {
    return ids.map(id => ({
      id,
      label: game.i18n.localize(`NECRONOLIB.Option.${prefix}.${id}`),
      selected: id === current
    }));
  }

  static #paletteOptions(cover) {
    return Object.keys(PALETTES[cover.material] ?? {}).map(id => ({
      id,
      label: game.i18n.localize(`NECRONOLIB.Option.Palette.${cover.material}.${id}`),
      selected: id === cover.palette
    }));
  }

  static async #onSave() {
    if (!game.user.isGM) return;
    // Nur auf existierende CoC7-Buch-Items verknüpfen (Welt- oder Actor-Item);
    // ungültige/handeditierte UUIDs werden verworfen statt gespeichert.
    const uuid = this.#link.coc7BookUuid;
    let validLink = !uuid;
    if (uuid) {
      try { validLink = (await fromUuid(uuid))?.type === 'book'; } catch { validLink = false; }
    }
    try {
      const saved = await saveBook(this.#journal, this.#cover, validLink ? this.#link : { coc7BookUuid: '' });
      this.#cover = saved.cover;
      this.#link = saved.link;
      ui.notifications.info(game.i18n.format('NECRONOLIB.Atelier.Saved', { journal: this.#journal.name }));
    } catch (error) {
      console.error('necronolib | save failed', error);
      ui.notifications.error(game.i18n.localize('NECRONOLIB.Atelier.SaveFailed'));
    }
  }

  static #onReset() {
    this.#cover = defaultCover();
    this.render();
  }

  /** Verwirft ungespeicherte Änderungen: Zustand aus den Journal-Flags neu laden. */
  static #onRevert() {
    this.#cover = getBookFlags(this.#journal);
    this.#link = getLinkFlags(this.#journal);
    this.render();
  }
}
