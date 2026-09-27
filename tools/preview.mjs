/**
 * Necronolib — Dev-Preview-Harness (node tools/preview.mjs).
 * Kompiliert das echte book.hbs-Partial (Template-Syntax-Check inklusive)
 * und rendert eine Cover-Matrix als dunkle HTML-Seite.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import Handlebars from 'handlebars';

const css = readFileSync('styles/necronolib.css', 'utf8');
const partialSrc = readFileSync('templates/partials/book.hbs', 'utf8');
Handlebars.registerPartial('book', Handlebars.compile(partialSrc));

/** Nur localize registrieren — wie in Foundry v14 (kein 'selected'-Helper). */
Handlebars.registerHelper('localize', (key) => key);

import { coverVars, runesFor } from '../src/cover/model.mjs';

const combos = [
  { label: 'Leder · Ochsenblut · Titel vergoldet', cover: { material: 'leather', palette: 'oxblood', wear: 'medium', thickness: 'medium', clasps: 'brass', title: { text: 'Cultes des Goules', font: 'serif', effect: 'gilt', position: 'center' } } },
  { label: 'Lack · Jade · Wälzer', cover: { material: 'lacquer', palette: 'jade', wear: 'none', thickness: 'tome', clasps: 'none', title: { text: 'De Vermis Mysteriis', font: 'runes', effect: 'gilt', position: 'top' } } },
  { label: 'Pergament · Elfenbein · Prägung', cover: { material: 'vellum', palette: 'ivory', wear: 'light', thickness: 'slim', clasps: 'none', title: { text: 'Reisetagebuch', font: 'sans', effect: 'emboss', position: 'center' } } },
  { label: 'Stoff · Weinrot · Eisen-Schließen', cover: { material: 'cloth', palette: 'wine', wear: 'heavy', thickness: 'medium', clasps: 'iron', title: { text: 'Familienchronik', font: 'serif', effect: 'ink', position: 'bottom' } } },
  { label: 'Leder · Schwarz · Runen ohne Titel', cover: { material: 'leather', palette: 'black', wear: 'heavy', thickness: 'tome', clasps: 'iron', title: { text: '', font: 'runes', effect: 'emboss', position: 'center' } } },
  { label: 'Lack · Karmesin · stark gealtert', cover: { material: 'lacquer', palette: 'crimson', wear: 'heavy', thickness: 'medium', clasps: 'brass', title: { text: 'Unaussprechliche Kulte', font: 'serif', effect: 'gilt', position: 'center' } } }
];

const cards = combos.map(({ label, cover }) => {
  const vars = Object.entries(coverVars(cover)).map(([k, v]) => `${k}:${v}`).join(';');
  const ctx = { cover, vars, runes: cover.title.text ? '' : runesFor(label), runesTitle: '' };
  const html = Handlebars.partials.book(ctx);
  return `<figure class="nl-card">${html}<figcaption>${label}</figcaption></figure>`;
}).join('\n');

const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Necronolib — Cover-Preview</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; background: #181410; color: #d8cfc0; font-family: Georgia, serif; display: flex; flex-wrap: wrap; gap: 48px; justify-content: center; align-items: flex-start; padding: 48px 24px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  figcaption { font-size: 0.85rem; opacity: 0.8; letter-spacing: 0.04em; max-width: 240px; text-align: center; }
  h1 { width: 100%; text-align: center; font-size: 1.1rem; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.7; }
${css}
</style>
</head>
<body>
<h1>Necronolib — Cover-Matrix</h1>
${cards}
</body>
</html>`;

writeFileSync('tools/preview.html', page);
console.log('tools/preview.html geschrieben,', combos.length, 'Cover-Kombinationen');
