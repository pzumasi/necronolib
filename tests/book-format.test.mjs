/**
 * Necronolib — Austauschformat-Tests (pure).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateBook, detectImportKind, isSafeImageSrc, buildBookExport, exportFileName, BOOK_FORMAT
} from '../src/io/book-format.mjs';

const example = JSON.parse(readFileSync(new URL('../docs/examples/cultes-des-goules.necronolib.json', import.meta.url), 'utf8'));

test('Beispieldatei ist gültig', () => {
  const res = validateBook(example);
  assert.deepEqual(res.errors, []);
  assert.equal(res.ok, true);
  assert.equal(res.book.pages.length, 4);
  assert.equal(res.book.pages[1].markdown.startsWith('Der Leser'), true);
  assert.equal(res.book.pages[2].keeperOnly, true);
  assert.equal(res.book.cover.title.font, 'runes');
});

test('detectImportKind erkennt Buch, CoC7-Item und Unbekanntes', () => {
  assert.equal(detectImportKind(example), BOOK_FORMAT);
  assert.equal(detectImportKind({ name: 'X', type: 'book', system: {} }), 'coc7-item');
  assert.equal(detectImportKind({ name: 'X', type: 'weapon', system: {} }), null);
  assert.equal(detectImportKind([]), null);
  assert.equal(detectImportKind(null), null);
});

test('validateBook: Pflichtfelder und Typen', () => {
  assert.equal(validateBook({}).ok, false);
  const res = validateBook({ format: BOOK_FORMAT, version: 2, name: '', pages: {} });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('version')));
  assert.ok(res.errors.some(e => e.includes('name')));
  assert.ok(res.errors.some(e => e.includes('pages')));
});

test('validateBook: unsichere Bildquellen und unbekannte Seitentypen werden abgelehnt', () => {
  const bad = validateBook({
    format: BOOK_FORMAT, version: 1, name: 'X',
    pages: [{ type: 'image', src: 'javascript:alert(1)' }, { type: 'pdf', src: 'a.pdf' }]
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 2);
});

test('validateBook: Cover wird normalisiert, Titel fällt auf name zurück', () => {
  const res = validateBook({ format: BOOK_FORMAT, version: 1, name: 'Necronomicon', cover: { material: 'fluff' }, pages: [] });
  assert.equal(res.ok, true);
  assert.equal(res.book.cover.material, 'leather');
  assert.equal(res.book.cover.title.text, 'Necronomicon');
});

test('validateBook: coc7.item muss ein Buch sein', () => {
  const res = validateBook({ format: BOOK_FORMAT, version: 1, name: 'X', pages: [], coc7: { item: { name: 'X', type: 'spell', system: {} } } });
  assert.equal(res.ok, false);
});

test('isSafeImageSrc', () => {
  for (const ok of ['worlds/w/a.webp', 'icons/svg/skull.svg', 'https://example.org/a.png', 'data:image/png;base64,AAAA']) {
    assert.equal(isSafeImageSrc(ok), true, ok);
  }
  for (const bad of ['javascript:alert(1)', 'data:text/html;base64,AAAA', '//evil.example/a.png', '', 42, 'vbscript:x']) {
    assert.equal(isSafeImageSrc(bad), false, String(bad));
  }
});

test('buildBookExport → validateBook ist verlustfrei (Roundtrip)', () => {
  const exported = buildBookExport({
    name: 'Buch',
    cover: { material: 'cloth', palette: 'navy', title: { text: 'Buch' } },
    pages: [
      { name: 'A', type: 'text', html: '<p>a</p>', keeperOnly: true, showTitle: true, titleLevel: 2 },
      { name: 'B', type: 'image', src: 'a.webp', caption: 'c' }
    ],
    coc7: { uuid: 'Item.x', name: 'Buch' }
  });
  const res = validateBook(JSON.parse(JSON.stringify(exported)));
  assert.equal(res.ok, true);
  assert.deepEqual(res.book.pages.map(p => p.name), ['A', 'B']);
  assert.equal(res.book.pages[0].keeperOnly, true);
  assert.equal(res.book.pages[0].titleLevel, 2);
  assert.equal(res.book.coc7.uuid, 'Item.x');
  assert.equal(res.book.cover.palette, 'navy');
});

test('exportFileName ist dateisystemtauglich', () => {
  assert.equal(exportFileName('Cultes des Goules'), 'cultes-des-goules.necronolib.json');
  assert.equal(exportFileName('Über «Mythos»!'), 'uber-mythos.necronolib.json');
  assert.equal(exportFileName('***'), 'buch.necronolib.json');
});
