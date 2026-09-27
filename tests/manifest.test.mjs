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
