/**
 * Necronolib — Reader-Preview-Harness (node tools/reader-preview.mjs).
 * Rendert Reader-Zustände (geschlossen/Aufschlag/Doppelseite) mit echten Templates.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import Handlebars from 'handlebars';

const css = readFileSync('styles/necronolib.css', 'utf8');
const readerCss = readFileSync('styles/reader.css', 'utf8');
Handlebars.registerPartial('book', Handlebars.compile(readFileSync('templates/partials/book.hbs', 'utf8')));
// Foundry-Pfad-Alias, damit reader.hbs ohne Foundry kompiliert.
Handlebars.registerPartial('modules/necronolib/templates/partials/book.hbs', Handlebars.partials.book);
const readerSrc = readFileSync('templates/reader.hbs', 'utf8');

// Echte Übersetzungen aus lang/de.json (verschachtelt → Punkt-Pfad).
const de = JSON.parse(readFileSync('lang/de.json', 'utf8'));
Handlebars.registerHelper('localize', (key) => String(key).split('.').reduce((o, k) => o?.[k], de) ?? key);

import { coverVars, runesFor } from '../src/cover/model.mjs';

const cover = { material: 'leather', palette: 'oxblood', wear: 'medium', thickness: 'tome', clasps: 'brass', title: { text: 'Cultes des Goules', font: 'serif', effect: 'gilt', position: 'center' } };
const coverCtx = {
  cover,
  vars: Object.entries(coverVars(cover)).map(([k, v]) => `${k}:${v}`).join('; '),
  runes: '', runesTitle: ''
};

const coc7 = {
  name: 'Cultes des Goules', sanityLoss: '2W6', mythosRating: 11, cmi: 3, cmf: 8,
  studyWeeks: 12, isMythos: true, isOccult: false
};

const p = (n, html, extra = {}) => ({ id: `p${n}`, name: `Seite ${n}`, folio: n, html, showTitle: false, titleTag: 'h2', keeperOnly: false, ...extra });
const lorem = (n) => `<h2>Kapitel ${n}</h2>` + Array.from({ length: 4 }, (_, i) =>
  `<p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. (${n}.${i + 1})</p>`).join('');

const base = {
  journal: { name: 'Cultes des Goules' },
  cover: coverCtx,
  isGM: true,
  showing: true,
  sharedCount: 2,
  sharedLabel: 'Geteilt (2)',
  following: false,
  coc7,
  coc7CanAct: true,
  keeperHtml: '<p><em>Der Comte d’Erlette … die Wahrheit steht in Kapitel VII.</em></p>'
};

const compile = Handlebars.compile(readerSrc);
const states = [
  { title: 'Geschlossen (Cover)', ctx: { ...base, isClosed: true, hasPages: true, label: 'Cover', isFirst: true, isLast: false, current: null } },
  { title: 'Aufschlag (Seite 1)', ctx: { ...base, isClosed: false, hasPages: true, label: '1', isFirst: true, isLast: false, current: { left: null, right: p(1, `<h1>Cultes des Goules</h1><p><em>par le Comte d’Erlette</em></p>${lorem(1)}`) } } },
  { title: 'Doppelseite (2–3)', ctx: { ...base, isClosed: false, hasPages: true, label: '2–3', isFirst: false, isLast: false, current: { left: p(2, lorem(2)), right: p(3, lorem(3), { keeperOnly: true, showTitle: true, name: 'Kapitel VII (SL)' }) } } }
];

const cards = states.map(({ title, ctx }) =>
  `<section class="rp-card"><h2>${title}</h2><div class="rp-frame">${compile(ctx)}</div></section>`
).join('\n');

const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Necronolib — Reader-Preview</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #14100c; color: #d8cfc0; font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; }
  h1 { font-size: 1rem; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.7; text-align: center; }
  .rp-card { max-width: 1040px; margin: 0 auto 36px; }
  .rp-card h2 { font-size: 0.85rem; opacity: 0.75; letter-spacing: 0.08em; margin: 0 0 8px; }
  .rp-frame { border: 1px solid rgba(185,143,47,.25); border-radius: 8px; padding: 12px; background: #201a14; display: flex; min-height: 560px; }
  .rp-frame section.nl-reader { flex: 1; }
  .rp-frame .nl-stage { min-height: 420px; }
${css}
${readerCss}
</style>
</head>
<body>
<h1>Necronolib — Reader-Zustände</h1>
${cards}
</body>
</html>`;

writeFileSync('tools/reader-preview.html', page);
console.log('tools/reader-preview.html geschrieben,', states.length, 'Zustände');
