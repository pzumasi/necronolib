/**
 * Necronolib — Manifest-, i18n- und Template-Konsistenz (ohne Foundry).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import Handlebars from 'handlebars';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('module.json'));

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  (v && typeof v === 'object') ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

test('module.json: Socket aktiviert (geteiltes Lesen braucht den Modul-Kanal)', () => {
  assert.equal(manifest.socket, true);
});

test('module.json: referenzierte Dateien existieren', () => {
  const files = [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)];
  for (const f of files) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
});

test('Sprachdateien haben identische Schlüssel (de ↔ en)', () => {
  const de = flatten(JSON.parse(read('lang/de.json'))).sort();
  const en = flatten(JSON.parse(read('lang/en.json'))).sort();
  assert.deepEqual(de, en);
});

test('Alle NECRONOLIB-Schlüssel aus Templates/Skripten existieren in de.json', () => {
  const keys = new Set(flatten(JSON.parse(read('lang/de.json'))));
  const sources = [
    ...readdirSync(new URL('../templates', import.meta.url)).filter(f => f.endsWith('.hbs')).map(f => `templates/${f}`),
    'templates/partials/book.hbs',
    ...readdirSync(new URL('../scripts', import.meta.url)).filter(f => f.endsWith('.mjs')).map(f => `scripts/${f}`)
  ];
  const missing = [];
  for (const src of sources) {
    for (const m of read(src).matchAll(/['"`](NECRONOLIB\.[A-Za-z0-9_.]+?)['"`]/g)) {
      if (!keys.has(m[1])) missing.push(`${src}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('Templates kompilieren (Handlebars-Syntax)', () => {
  for (const t of ['templates/reader.hbs', 'templates/atelier.hbs', 'templates/partials/book.hbs']) {
    assert.doesNotThrow(() => Handlebars.precompile(read(t)), t);
  }
});

test('Templates nutzen nur Handlebars-Builtins + localize (kein `selected` o. Ä. — fehlt in v14)', () => {
  const opts = { knownHelpersOnly: true, knownHelpers: { localize: true } };
  for (const t of ['templates/reader.hbs', 'templates/atelier.hbs', 'templates/partials/book.hbs']) {
    assert.doesNotThrow(() => Handlebars.precompile(read(t), opts), t);
  }
});

test('Atelier-Template rendert mit v14-Helpern und markiert die gewählten Optionen', () => {
  const hb = Handlebars.create();
  hb.registerHelper('localize', (k) => k);
  hb.registerPartial('modules/necronolib/templates/partials/book.hbs', read('templates/partials/book.hbs'));
  const opt = (ids, cur) => ids.map(id => ({ id, label: id, selected: id === cur }));
  const html = hb.compile(read('templates/atelier.hbs'))({
    cover: { material: 'cloth', palette: 'navy', wear: 'heavy', clasps: 'iron', thickness: 'tome', title: { text: 'X', font: 'sans', effect: 'ink', position: 'top' } },
    vars: '', runes: 'ᚠ', runesTitle: '', link: { coc7BookUuid: '' }, coc7Active: false,
    materialOptions: opt(['leather', 'cloth'], 'cloth'),
    paletteOptions: opt(['navy', 'wine'], 'navy'),
    wearOptions: opt(['none', 'heavy'], 'heavy'),
    thicknessOptions: opt(['slim', 'tome'], 'tome'),
    claspOptions: opt(['none', 'iron'], 'iron'),
    fontOptions: opt(['serif', 'sans'], 'sans'),
    effectOptions: opt(['gilt', 'ink'], 'ink'),
    positionOptions: opt(['center', 'top'], 'top')
  });
  for (const v of ['cloth', 'navy', 'heavy', 'tome', 'iron', 'sans', 'ink', 'top']) {
    assert.match(html, new RegExp(`value="${v}" selected>`), v);
  }
  assert.doesNotMatch(html, /value="leather" selected/);
});
