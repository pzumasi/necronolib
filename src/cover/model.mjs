/**
 * Necronolib — Cover model (pure, no Foundry dependencies).
 * Node-testbar: alle Berechnungen für prozedurale Buchcovers.
 */

export const SCHEMA_VERSION = 1;

export const COVER_MATERIALS = Object.freeze(['leather', 'lacquer', 'vellum', 'cloth']);
export const WEAR_LEVELS = Object.freeze(['none', 'light', 'medium', 'heavy']);
export const TITLE_EFFECTS = Object.freeze(['gilt', 'emboss', 'ink']);
export const TITLE_FONTS = Object.freeze(['serif', 'sans', 'runes']);
export const TITLE_POSITIONS = Object.freeze(['top', 'center', 'bottom']);
export const CLASP_STYLES = Object.freeze(['none', 'brass', 'iron']);
export const THICKNESSES = Object.freeze(['slim', 'medium', 'tome']);

/** Farbpaletten je Material: base = Fläche, dark = Schatten/Kanten, light = Highlights. */
export const PALETTES = Object.freeze({
  leather: Object.freeze({
    oxblood: { base: '#5a1f24', dark: '#3d1216', light: '#7d3539' },
    black: { base: '#241f1d', dark: '#141110', light: '#3d3733' },
    tan: { base: '#8a6a43', dark: '#63492c', light: '#a98a5f' },
    forest: { base: '#2f4232', dark: '#1e2c20', light: '#48604a' }
  }),
  cloth: Object.freeze({
    navy: { base: '#2c3a56', dark: '#1c273b', light: '#45577b' },
    wine: { base: '#5c2a3a', dark: '#3f1b27', light: '#7c4052' },
    olive: { base: '#555537', dark: '#3a3a24', light: '#73734e' },
    charcoal: { base: '#3a3a3a', dark: '#252525', light: '#545454' }
  }),
  lacquer: Object.freeze({
    crimson: { base: '#6b1220', dark: '#470a15', light: '#93243a' },
    black: { base: '#1c1a1e', dark: '#0d0c0f', light: '#35323a' },
    indigo: { base: '#2b2a55', dark: '#1a1938', light: '#43416f' },
    jade: { base: '#1f5545', dark: '#123629', light: '#2f765e' }
  }),
  vellum: Object.freeze({
    cream: { base: '#e8dcc0', dark: '#c6b591', light: '#f4ecd8' },
    honey: { base: '#d9be8a', dark: '#b89c66', light: '#e8d3a8' },
    ivory: { base: '#efe8da', dark: '#cdc3ae', light: '#f8f3e9' },
    slate: { base: '#b9bcb4', dark: '#96998f', light: '#d2d5cc' }
  })
});

/** Wear-Overlay-Opacity je Abnutzungsstufe. */
export const WEAR_OPACITY = Object.freeze({ none: 0, light: 0.18, medium: 0.34, heavy: 0.55 });

/** Spalten-/Buchblockbreite je Dicke (px). */
export const THICKNESS_METRICS = Object.freeze({
  slim: { spine: 16, pages: 8 },
  medium: { spine: 26, pages: 12 },
  tome: { spine: 40, pages: 18 }
});

export const DEFAULT_COVER = Object.freeze({
  material: 'leather',
  palette: 'oxblood',
  wear: 'medium',
  clasps: 'none',
  thickness: 'medium',
  title: Object.freeze({ text: '', font: 'serif', effect: 'gilt', position: 'center' })
});

const oneOf = (list, value, fallback) => (typeof value === 'string' && list.includes(value) ? value : fallback);
const firstPaletteOf = (material) => Object.keys(PALETTES[material] ?? PALETTES.leather)[0];
const paletteExists = (material, palette) => Boolean(PALETTES[material]?.[palette]);

/**
 * Vollständiges, validiertes Cover-Objekt.
 * Repariert ungültige/handeditierte Werte defensiv (keine Throws).
 * @param {object|undefined} raw
 * @returns {object} deep copy mit garantiertem Schema
 */
export function normalizeCover(raw) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  const material = oneOf(COVER_MATERIALS, r.material, DEFAULT_COVER.material);
  const palette = paletteExists(material, r.palette) ? r.palette : firstPaletteOf(material);
  const t = (r.title && typeof r.title === 'object') ? r.title : {};
  const text = (typeof t.text === 'string' ? t.text : '').trim().slice(0, 120);
  return {
    material,
    palette,
    wear: oneOf(WEAR_LEVELS, r.wear, DEFAULT_COVER.wear),
    clasps: oneOf(CLASP_STYLES, r.clasps, DEFAULT_COVER.clasps),
    thickness: oneOf(THICKNESSES, r.thickness, DEFAULT_COVER.thickness),
    title: {
      text,
      font: oneOf(TITLE_FONTS, t.font, DEFAULT_COVER.title.font),
      effect: oneOf(TITLE_EFFECTS, t.effect, DEFAULT_COVER.title.effect),
      position: oneOf(TITLE_POSITIONS, t.position, DEFAULT_COVER.title.position)
    }
  };
}

/** Frisches Default-Cover (deep copy). */
export function defaultCover() {
  return normalizeCover({});
}

/** Runen-Alphabet (Unicode Runic Block, Zeichen mit guter Font-Abdeckung). */
const RUNE_GLYPHS = Object.freeze('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split(''));

/**
 * Deterministische Runen-Sequenz aus einem Seed (z. B. Journal-Name).
 * Für Titel-lose Bücher: prozedurale "okkulte" Runen statt leerer Fläche.
 * @param {string} seed beliebiger String
 * @param {number} count Anzahl Zeichen (default 9)
 * @returns {string} z. B. "ᚠᚢᚦᚨᚱᚲᚷᚹᚺ"
 */
export function runesFor(seed, count = 9) {
  let h = 2166136261;
  const s = String(seed ?? 'necronolib');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    out.push(RUNE_GLYPHS[Math.abs(h) % RUNE_GLYPHS.length]);
  }
  return out.join('');
}

/**
 * Auto-Fit: Schriftgröße nach längstem Wort (verhindert Overflow langer
 * deutscher Komposita im schmalen Titelfenster).
 * @param {string} text Titeltitel-Text
 * @returns {string} CSS-Größe
 */
export function titleFontSize(text) {
  const longest = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .reduce((m, w) => Math.max(m, w.length), 0);
  if (longest === 0) return '1.35rem';
  if (longest <= 9) return '1.35rem';
  if (longest <= 12) return '1.15rem';
  if (longest <= 15) return '0.95rem';
  return '0.82rem';
}

/**
 * CSS custom properties für ein Cover (Strings, render-fertig).
 * @param {object} cover normalisiertes Cover (wird intern nochmal normalisiert)
 */
export function coverVars(cover) {
  const c = normalizeCover(cover);
  const colors = PALETTES[c.material][c.palette];
  return {
    '--nlc-base': colors.base,
    '--nlc-dark': colors.dark,
    '--nlc-light': colors.light,
    '--nl-wear-o': String(WEAR_OPACITY[c.wear]),
    '--nl-spine-w': `${THICKNESS_METRICS[c.thickness].spine}px`,
    '--nl-pages-w': `${THICKNESS_METRICS[c.thickness].pages}px`,
    '--nl-title-size': titleFontSize(c.title.text)
  };
}
