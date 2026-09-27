/**
 * Necronolib — Import/Export (Foundry-Anbindung).
 * Format + Validierung: src/io/book-format.mjs · Doku: .claude/skills/necronolib-book-import/SKILL.md
 *
 * - Buch exportieren: Journal → *.necronolib.json (Cover, Seiten, CoC7-Verknüpfung inkl. Item-Daten)
 * - Buch importieren: *.necronolib.json → neues Journal (+ ggf. CoC7-Item anlegen/verknüpfen)
 * - CoC7-Buch importieren: Item-Export-JSON (type "book") → Welt-Item + verknüpftes Journal
 * - Aus CoC7-Buch erstellen: Welt- oder Kompendium-Buch → verknüpftes Journal
 */
import { detectImportKind, validateBook, buildBookExport, exportFileName, isSafeImageSrc, BOOK_FORMAT } from '../src/io/book-format.mjs';
import { visiblePages } from '../src/reader/pagination.mjs';
import { normalizeCover, SCHEMA_VERSION } from '../src/cover/model.mjs';
import { getBookFlags, getLinkFlags } from './schema.mjs';
import { isCoC7 } from './coc7.mjs';

const { DialogV2 } = foundry.applications.api;
const TEXT_FORMAT_HTML = 1; // CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/* ------------------------------------------------------------------ */
/* HTML-Aufbereitung                                                    */
/* ------------------------------------------------------------------ */

const BLOCKED_TAGS = 'script, iframe, object, embed, link, meta, base, form, frame, frameset, applet';
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background'];

/** Entfernt aktive Inhalte aus importiertem HTML (Scripts, Event-Handler, javascript:-URLs). */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${String(html ?? '')}</body>`, 'text/html');
  doc.body.querySelectorAll(BLOCKED_TAGS).forEach(el => el.remove());
  for (const el of doc.body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') el.removeAttribute(attr.name);
      else if (URL_ATTRS.includes(name) && /^(javascript|vbscript|data:text)/.test(value)) el.removeAttribute(attr.name);
    }
  }
  return doc.body.innerHTML;
}

/** Markdown → HTML (Foundrys showdown, sonst schlichte Absätze). */
function markdownToHtml(md) {
  const Showdown = globalThis.showdown;
  if (Showdown?.Converter) {
    return new Showdown.Converter({ ...(CONST.SHOWDOWN_OPTIONS ?? {}) }).makeHtml(md);
  }
  return String(md).split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/* ------------------------------------------------------------------ */
/* Export                                                               */
/* ------------------------------------------------------------------ */

/** Item-Daten ohne welt-spezifische Felder (für Export/Neuanlage). */
function portableItemData(item) {
  const data = item.toObject();
  for (const key of ['_id', '_stats', 'folder', 'sort', 'ownership']) delete data[key];
  return data;
}

/** Journal → Austauschformat (Objekt). */
export async function exportBookData(journal) {
  const pages = visiblePages(journal.pages?.contents ?? [], { isGM: true }).map(p => ({
    name: p.name,
    type: p.type === 'image' ? 'image' : 'text',
    html: p.type === 'text' ? (p.text?.content ?? '') : undefined,
    src: p.type === 'image' ? (p.src ?? '') : undefined,
    caption: p.type === 'image' ? (p.image?.caption ?? '') : undefined,
    keeperOnly: Boolean(p.flags?.necronolib?.keeperOnly),
    showTitle: Boolean(p.title?.show),
    titleLevel: p.title?.level ?? 1
  })).filter(p => p.type === 'image' || p.html !== undefined);

  let coc7 = null;
  const { coc7BookUuid } = getLinkFlags(journal);
  if (coc7BookUuid) {
    let item = null;
    try { item = await fromUuid(coc7BookUuid); } catch { /* ignoriert */ }
    coc7 = { uuid: coc7BookUuid, name: item?.name ?? '', ...(item?.type === 'book' ? { item: portableItemData(item) } : {}) };
  }
  return buildBookExport({ name: journal.name, cover: getBookFlags(journal), pages, coc7 });
}

/** Journal als Datei herunterladen. */
export async function exportBook(journal) {
  if (!game.user.isGM) return;
  const data = await exportBookData(journal);
  const save = foundry.utils.saveDataToFile ?? globalThis.saveDataToFile;
  save(JSON.stringify(data, null, 2), 'application/json', exportFileName(journal.name));
  ui.notifications.info(t('NECRONOLIB.Io.Exported', { journal: journal.name }));
}

/* ------------------------------------------------------------------ */
/* Import                                                               */
/* ------------------------------------------------------------------ */

/** Seiten des Austauschformats → JournalEntryPage-Daten. */
function pageData(page, index) {
  const base = {
    name: page.name,
    sort: (index + 1) * 100000,
    title: { show: page.showTitle, level: page.titleLevel },
    flags: page.keeperOnly ? { necronolib: { keeperOnly: true } } : {}
  };
  if (page.type === 'image') {
    return { ...base, type: 'image', src: isSafeImageSrc(page.src) ? page.src : '', image: { caption: page.caption ?? '' } };
  }
  const html = page.html ?? markdownToHtml(page.markdown ?? '');
  return { ...base, type: 'text', text: { content: sanitizeHtml(html), format: TEXT_FORMAT_HTML } };
}

/** CoC7-Buch-Item anlegen (aus Export-/Item-JSON). */
async function createCoc7Item(itemData) {
  if (!isCoC7(game)) throw new Error(t('NECRONOLIB.Io.NeedsCoc7'));
  const data = { ...itemData };
  for (const key of ['_id', '_stats', 'folder', 'sort', 'ownership']) delete data[key];
  data.type = 'book';
  return Item.implementation.create(data);
}

/** CoC7-Verknüpfung eines importierten Buchs auflösen (uuid → name → item anlegen). */
async function resolveCoc7Link(coc7, warnings) {
  if (!coc7) return '';
  if (coc7.uuid) {
    try {
      const item = await fromUuid(coc7.uuid);
      if (item?.type === 'book') return item.uuid;
    } catch { /* weiter */ }
  }
  if (coc7.name && isCoC7(game)) {
    const byName = game.items.find(i => i.type === 'book' && i.name === coc7.name);
    if (byName) return byName.uuid;
  }
  if (coc7.item) {
    if (!isCoC7(game)) { warnings.push(t('NECRONOLIB.Io.NeedsCoc7')); return ''; }
    const created = await createCoc7Item(coc7.item);
    return created?.uuid ?? '';
  }
  warnings.push(t('NECRONOLIB.Io.LinkNotFound', { name: coc7.name || coc7.uuid }));
  return '';
}

/**
 * Buch im Austauschformat importieren.
 * @returns {Promise<JournalEntry|null>}
 */
export async function importBookData(data) {
  if (!game.user.isGM) return null;
  const result = validateBook(data);
  if (!result.ok) {
    ui.notifications.error(t('NECRONOLIB.Io.Invalid', { errors: result.errors.slice(0, 5).join('; ') }));
    console.warn('necronolib | Import abgelehnt', result.errors);
    return null;
  }
  const { book } = result;
  const warnings = [...result.warnings];
  const coc7BookUuid = await resolveCoc7Link(book.coc7, warnings);
  const journal = await JournalEntry.implementation.create({
    name: book.name,
    flags: { necronolib: { book: normalizeCover(book.cover), version: SCHEMA_VERSION, link: { coc7BookUuid } } },
    pages: book.pages.map(pageData)
  });
  if (warnings.length) console.warn('necronolib | Import-Hinweise', warnings);
  ui.notifications.info(t('NECRONOLIB.Io.Imported', { journal: book.name, pages: book.pages.length, warnings: warnings.length }));
  return journal;
}

/**
 * Journal aus einem CoC7-Buch-Item erstellen und verknüpfen.
 * Seiten: Beschreibung + Buchinhalt (system.content) für Spieler, SL-Notizen (keeperOnly) — jeweils falls vorhanden.
 */
export async function createBookFromCoc7Item(item) {
  if (!game.user.isGM || item?.type !== 'book') return null;
  const pages = [];
  const description = item.system?.description?.value;
  const keeper = item.system?.description?.keeper;
  if (description) pages.push({ name: t('NECRONOLIB.Io.PageDescription'), type: 'text', html: description, showTitle: true, titleLevel: 1 });
  const content = item.system?.content;
  if (content) pages.push({ name: t('NECRONOLIB.Io.PageContent'), type: 'text', html: content, showTitle: true, titleLevel: 1 });
  if (keeper) pages.push({ name: t('NECRONOLIB.Io.PageKeeper'), type: 'text', html: keeper, keeperOnly: true, showTitle: true, titleLevel: 1 });
  const journal = await JournalEntry.implementation.create({
    name: item.name,
    flags: {
      necronolib: {
        book: normalizeCover({ title: { text: item.name } }),
        version: SCHEMA_VERSION,
        link: { coc7BookUuid: item.uuid }
      }
    },
    pages: pages.map(pageData)
  });
  ui.notifications.info(t('NECRONOLIB.Io.CreatedFromCoc7', { journal: item.name }));
  return journal;
}

/** Datei (JSON) importieren: Necronolib-Buch oder CoC7-Buch-Item. */
export async function importFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (error) {
    ui.notifications.error(t('NECRONOLIB.Io.NotJson'));
    return null;
  }
  switch (detectImportKind(data)) {
    case BOOK_FORMAT:
      return importBookData(data);
    case 'coc7-item': {
      if (!isCoC7(game)) { ui.notifications.error(t('NECRONOLIB.Io.NeedsCoc7')); return null; }
      const item = await createCoc7Item(data);
      return item ? createBookFromCoc7Item(item) : null;
    }
    default:
      ui.notifications.error(t('NECRONOLIB.Io.UnknownFormat'));
      return null;
  }
}

/** Buch-Items aus Welt + Kompendien (für „Aus CoC7-Buch erstellen“). */
async function coc7BookChoices() {
  const choices = game.items.filter(i => i.type === 'book')
    .map(i => ({ value: i.uuid, label: i.name, group: t('NECRONOLIB.Io.GroupWorld') }));
  for (const pack of game.packs.filter(p => p.documentName === 'Item')) {
    try {
      const index = await pack.getIndex({ fields: ['type'] });
      for (const entry of index) {
        if (entry.type === 'book') choices.push({ value: entry.uuid ?? `Compendium.${pack.collection}.Item.${entry._id}`, label: entry.name, group: pack.title });
      }
    } catch (error) {
      console.warn(`necronolib | Kompendium ${pack.collection} nicht lesbar`, error);
    }
  }
  return choices.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

/** Kompendium-Item bei Bedarf in die Welt importieren (Verknüpfung braucht ein Welt-/Actor-Item). */
async function worldItemFor(uuid) {
  const item = await fromUuid(uuid);
  if (!item || item.type !== 'book') return null;
  if (!item.pack) return item;
  return game.items.importFromCompendium(game.packs.get(item.pack), item.id);
}

/** Import-Dialog (Verzeichnis-Button): Datei oder CoC7-Buch wählen. */
export async function openImportDialog() {
  if (!game.user.isGM) return null;
  const coc7 = isCoC7(game);
  let coc7Block = '';
  if (coc7) {
    const choices = await coc7BookChoices();
    const groups = Map.groupBy
      ? Map.groupBy(choices, c => c.group)
      : choices.reduce((m, c) => m.set(c.group, [...(m.get(c.group) ?? []), c]), new Map());
    const options = [...groups].map(([group, list]) => `<optgroup label="${escapeHtml(group)}">${
      list.map(c => `<option value="${escapeHtml(c.value)}">${escapeHtml(c.label)}</option>`).join('')}</optgroup>`).join('');
    coc7Block = `<fieldset><legend>${escapeHtml(t('NECRONOLIB.Io.FromCoc7'))}</legend>
      <p class="hint">${escapeHtml(t('NECRONOLIB.Io.FromCoc7Hint'))}</p>
      ${choices.length ? `<select name="coc7Uuid"><option value="">—</option>${options}</select>` : `<p>${escapeHtml(t('NECRONOLIB.Io.NoCoc7Books'))}</p>`}
    </fieldset>`;
  }
  const content = `<fieldset><legend>${escapeHtml(t('NECRONOLIB.Io.FromFile'))}</legend>
      <p class="hint">${escapeHtml(t(coc7 ? 'NECRONOLIB.Io.FromFileHintCoc7' : 'NECRONOLIB.Io.FromFileHint'))}</p>
      <input type="file" name="file" accept=".json,application/json">
    </fieldset>${coc7Block}`;

  return DialogV2.wait({
    window: { title: t('NECRONOLIB.Io.ImportTitle'), icon: 'fa-solid fa-file-import' },
    classes: ['necronolib', 'nl-import-dialog'],
    content,
    buttons: [{
      action: 'import',
      label: t('NECRONOLIB.Io.ImportButton'),
      icon: 'fa-solid fa-file-import',
      default: true,
      callback: async (_event, button) => {
        const form = button.form;
        const file = form.elements.file?.files?.[0];
        const uuid = form.elements.coc7Uuid?.value;
        if (file) return importFile(file);
        if (uuid) {
          const item = await worldItemFor(uuid);
          return item ? createBookFromCoc7Item(item) : null;
        }
        ui.notifications.warn(t('NECRONOLIB.Io.NothingSelected'));
        return null;
      }
    }],
    rejectClose: false
  });
}

/** Import-Button in den Kopf des Journal-Verzeichnisses (nur GM). */
export function addDirectoryButton(html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector('.nl-import-btn')) return;
  const target = root.querySelector('.header-actions') ?? root.querySelector('.directory-header');
  if (!target) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nl-import-btn';
  button.innerHTML = `<i class="fa-solid fa-book-skull"></i> ${escapeHtml(t('NECRONOLIB.Io.ImportButtonShort'))}`;
  button.addEventListener('click', (event) => { event.preventDefault(); openImportDialog(); });
  target.append(button);
}
