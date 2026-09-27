/**
 * Necronolib — Austauschformat für Bücher (pure, kein Foundry).
 * Format + Regeln: .claude/skills/necronolib-book-import/SKILL.md
 *
 *  { "format": "necronolib-book", "version": 1, "name": "…",
 *    "cover": { …Cover-Schema… },
 *    "coc7": { "uuid"?: "Item.…", "name"?: "…", "item"?: { name, type: "book", system: {…} } },
 *    "pages": [ { "name", "type": "text"|"image", "html"|"markdown", "src", "caption",
 *                 "keeperOnly", "showTitle", "titleLevel" } ] }
 */
import { normalizeCover } from '../cover/model.mjs';

export const BOOK_FORMAT = 'necronolib-book';
export const BOOK_FORMAT_VERSION = 1;
export const LIMITS = Object.freeze({ pages: 500, name: 200, html: 500_000 });

/** Was für eine Datei ist das? 'necronolib-book' | 'coc7-item' | null */
export function detectImportKind(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.format === BOOK_FORMAT) return BOOK_FORMAT;
  if (data.type === 'book' && data.system && typeof data.system === 'object' && typeof data.name === 'string') return 'coc7-item';
  return null;
}

/**
 * Bildquelle erlauben? Relative Foundry-Pfade, http(s) und data:image.
 * Blockt javascript:, vbscript:, data:text/html usw.
 */
export function isSafeImageSrc(src) {
  if (typeof src !== 'string') return false;
  const s = src.trim();
  if (!s || s.length > 2048) return false;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return false; // anderes Schema
  return !s.startsWith('//');
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Validiert + normalisiert ein Buch im Austauschformat.
 * Wirft nicht; liefert Fehler (Abbruch) und Warnungen (Datei nutzbar).
 * @returns {{ok: boolean, errors: string[], warnings: string[], book: object|null}}
 */
export function validateBook(data) {
  const errors = [];
  const warnings = [];
  if (detectImportKind(data) !== BOOK_FORMAT) {
    return { ok: false, errors: [`"format" muss "${BOOK_FORMAT}" sein`], warnings, book: null };
  }
  if (data.version !== BOOK_FORMAT_VERSION) {
    errors.push(`"version" ${JSON.stringify(data.version)} wird nicht unterstützt (erwartet ${BOOK_FORMAT_VERSION})`);
  }
  const name = str(data.name, LIMITS.name);
  if (!name) errors.push('"name" fehlt');
  if (!Array.isArray(data.pages)) errors.push('"pages" muss ein Array sein');
  const rawPages = Array.isArray(data.pages) ? data.pages : [];
  if (rawPages.length > LIMITS.pages) errors.push(`zu viele Seiten (${rawPages.length} > ${LIMITS.pages})`);

  const pages = [];
  rawPages.slice(0, LIMITS.pages).forEach((p, i) => {
    const where = `pages[${i}]`;
    if (!p || typeof p !== 'object') { errors.push(`${where}: kein Objekt`); return; }
    const type = p.type ?? 'text';
    const page = {
      name: str(p.name, LIMITS.name) || `${i + 1}`,
      type,
      keeperOnly: p.keeperOnly === true,
      showTitle: p.showTitle === true,
      titleLevel: [1, 2, 3].includes(p.titleLevel) ? p.titleLevel : 1
    };
    if (type === 'text') {
      const html = typeof p.html === 'string' ? p.html : '';
      const markdown = typeof p.markdown === 'string' ? p.markdown : '';
      if (html && markdown) warnings.push(`${where}: "html" und "markdown" gesetzt — "html" gewinnt`);
      if (!html && !markdown) warnings.push(`${where}: leere Textseite`);
      if ((html || markdown).length > LIMITS.html) errors.push(`${where}: Text zu lang`);
      if (html) page.html = html; else page.markdown = markdown;
    } else if (type === 'image') {
      if (!isSafeImageSrc(p.src)) errors.push(`${where}: "src" fehlt oder ist nicht erlaubt`);
      page.src = typeof p.src === 'string' ? p.src.trim() : '';
      page.caption = str(p.caption, 500);
    } else {
      errors.push(`${where}: "type" ${JSON.stringify(type)} nicht unterstützt (text|image)`);
      return;
    }
    pages.push(page);
  });

  let coc7 = null;
  if (data.coc7 !== undefined && data.coc7 !== null) {
    const c = data.coc7;
    if (typeof c !== 'object') errors.push('"coc7" muss ein Objekt sein');
    else {
      coc7 = { uuid: str(c.uuid, 300), name: str(c.name, LIMITS.name), item: null };
      if (c.item !== undefined) {
        if (detectImportKind(c.item) === 'coc7-item') coc7.item = c.item;
        else errors.push('"coc7.item" muss ein CoC7-Buch-Item sein ({ name, type: "book", system })');
      }
      if (!coc7.uuid && !coc7.name && !coc7.item) warnings.push('"coc7" ohne uuid/name/item wird ignoriert');
    }
  }

  if (data.cover !== undefined && (typeof data.cover !== 'object' || data.cover === null)) {
    errors.push('"cover" muss ein Objekt sein');
  }
  const cover = normalizeCover({ ...(data.cover ?? {}), title: { text: name, ...(data.cover?.title ?? {}) } });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    book: errors.length ? null : { name, cover, coc7, pages }
  };
}

/**
 * Export-Objekt aus Foundry-unabhängigen Daten bauen.
 * @param {{name: string, cover: object, pages: Array<object>, coc7?: object|null}} src
 */
export function buildBookExport({ name, cover, pages, coc7 = null }) {
  const out = {
    format: BOOK_FORMAT,
    version: BOOK_FORMAT_VERSION,
    name: String(name ?? ''),
    cover: normalizeCover(cover),
    pages: (pages ?? []).map(p => {
      const base = { name: p.name, type: p.type, keeperOnly: Boolean(p.keeperOnly), showTitle: Boolean(p.showTitle), titleLevel: p.titleLevel ?? 1 };
      return p.type === 'image'
        ? { ...base, src: p.src ?? '', caption: p.caption ?? '' }
        : { ...base, html: p.html ?? '' };
    })
  };
  if (coc7 && (coc7.uuid || coc7.name || coc7.item)) out.coc7 = coc7;
  return out;
}

/** Dateiname für den Export (ASCII, ohne Sonderzeichen). */
export function exportFileName(name) {
  const base = String(name ?? 'buch')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'buch';
  return `${base}.necronolib.json`;
}
