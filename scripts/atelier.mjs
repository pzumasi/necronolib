/**
 * Necronolib — Cover-Atelier (lite).
 * AppV2-Fenster: Live-Vorschau + Feldeinstellungen, Speichern in flags.necronolib.
 * Verwendet nur verifizierte v14-Idiome: actions/data-action, this.element, this.render().
 */
import { getBookFlags, setBookFlags, getLinkFlags, setLinkFlags } from './schema.mjs';
import { isCoC7, listBookItems } from './coc7.mjs';
import {
  normalizeCover, defaultCover, coverVars, runesFor,
  COVER_MATERIALS, WEAR_LEVELS, TITLE_EFFECTS, TITLE_FONTS, TITLE_POSITIONS, CLASP_STYLES, THICKNESSES, PALETTES
} from '../src/cover/model.mjs';
import { applyCover } from '../src/cover/render.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Instanzen je Journal (mehrfach öffnen vermeiden). */
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
      reset: NecronolibAtelier.#onReset
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
    const key = journal?.uuid ?? String(journal?.id);
    if (!key) return null;
    let app = OPEN.get(key);
    if (!app) {
      app = new NecronolibAtelier(journal);
      OPEN.set(key, app);
      app.render(true);
    } else {
      app.render(true);
    }
    return app;
  }

  async _prepareContext() {
    const vars = Object.entries(coverVars(this.#cover)).map(([k, v]) => `${k}: ${v}`).join('; ');
    const showRunes = !this.#cover.title.text;
    const coc7Books = isCoC7(game)
      ? listBookItems(game.items).map(i => ({ uuid: i.uuid, name: i.name, selected: i.uuid === this.#link.coc7BookUuid }))
      : null;
    return {
      journal: { id: this.#journal.id, name: this.#journal.name },
      cover: this.#cover,
      vars,
      link: this.#link,
      runes: showRunes ? runesFor(this.#journal.uuid) : '',
      runesTitle: showRunes ? game.i18n.localize('NECRONOLIB.Atelier.RunesHint') : '',
      coc7Active: isCoC7(game),
      coc7Books,
      materialOptions: NecronolibAtelier.#options('Material', COVER_MATERIALS),
      paletteOptions: NecronolibAtelier.#paletteOptions(this.#cover),
      wearOptions: NecronolibAtelier.#options('Wear', WEAR_LEVELS),
      thicknessOptions: NecronolibAtelier.#options('Thickness', THICKNESSES),
      claspOptions: NecronolibAtelier.#options('Clasps', CLASP_STYLES),
      fontOptions: NecronolibAtelier.#options('TitleFont', TITLE_FONTS),
      effectOptions: NecronolibAtelier.#options('TitleEffect', TITLE_EFFECTS),
      positionOptions: NecronolibAtelier.#options('TitlePosition', TITLE_POSITIONS)
    };
  }

  /** Nach jedem Render: Change-Listener auf alle Felder setzen ( öffentl. API, kein privates Framework-Event). */
  #wire() {
    for (const field of this.element.querySelectorAll('[data-nl-field]')) {
      field.addEventListener('change', () => {
        const name = field.getAttribute('name');
        if (!name) return;
        this.#setField(name, field.value);
        if (field.dataset.nlRerender === '1') {
          // Material-Wechsel: andere Palettenliste + volle Optionen-Kette neu rendern.
          this.#renderAndWire();
        } else {
          // Live-Vorschau ohne Re-Render (Fokus/Scroll bleibt).
          applyCover(this.element, this.#cover);
        }
      });
    }
  }

  async #renderAndWire() {
    await this.render();
    this.#wire();
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

  static #options(prefix, ids) {
    return ids.map(id => ({ id, label: game.i18n.localize(`NECRONOLIB.Option.${prefix}.${id}`) }));
  }

  static #paletteOptions(cover) {
    return Object.keys(PALETTES[cover.material] ?? {}).map(id => ({
      id,
      label: game.i18n.localize(`NECRONOLIB.Option.Palette.${cover.material}.${id}`)
    }));
  }

  static async #onSave() {
    await setBookFlags(this.#journal, this.#cover);
    await setLinkFlags(this.#journal, this.#link);
    ui.notifications.info(game.i18n.format('NECRONOLIB.Atelier.Saved', { journal: this.#journal.name }));
  }

  static #onReset() {
    this.#cover = defaultCover();
    this.#renderAndWire();
  }
}
