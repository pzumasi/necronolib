/**
 * Necronolib — CoC7-Bridge-Tests (ohne echtes Foundry).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isCoC7, listBookItems, bookStats, keeperHtml } from '../scripts/coc7.mjs';

const bookItem = (over = {}) => ({
  id: 'itm1',
  uuid: 'Item.itm1',
  name: 'Cultes des Goules',
  type: 'book',
  system: {
    author: 'Comte d\u2019Erlette',
    language: 'French',
    difficultyLevel: 'hard',
    sanityLoss: '2D6',
    mythosRating: 11,
    study: { necessary: 12, units: 'CoC7.weeks' },
    gains: { cthulhuMythos: { initial: 3, final: 8 }, occult: 2 },
    type: { mythos: true, occult: false, other: false },
    description: { value: '<p>sichtbar</p>', keeper: '<p>geheim</p>' },
    ...over
  }
});

test('isCoC7 erkennt das System defensiv', () => {
  assert.equal(isCoC7({ system: { id: 'CoC7' } }), true);
  assert.equal(isCoC7({ system: { id: 'dnd5e' } }), false);
  assert.equal(isCoC7(null), false);
  assert.equal(isCoC7({}), false);
});

test('listBookItems filtert auf type book', () => {
  const items = [bookItem(), { id: 'w', type: 'weapon' }, { id: 's', type: 'spell' }, bookItem()];
  const books = listBookItems(items);
  assert.equal(books.length, 2);
  assert.deepEqual(listBookItems(null), []);
});

test('bookStats normalisiert das CoC7-Schema', () => {
  const stats = bookStats(bookItem());
  assert.equal(stats.name, 'Cultes des Goules');
  assert.equal(stats.sanityLoss, '2D6');
  assert.equal(stats.mythosRating, 11);
  assert.equal(stats.cmi, 3);
  assert.equal(stats.cmf, 8);
  assert.equal(stats.studyWeeks, 12);
  assert.equal(stats.difficulty, 'hard');
  assert.equal(stats.isMythos, true);
  assert.equal(stats.isOccult, false);
});

test('bookStats toleriert fehlende Felder und falsche Typen', () => {
  const stats = bookStats({ type: 'book', name: 'Kahl', system: {} });
  assert.equal(stats.sanityLoss, '0');
  assert.equal(stats.mythosRating, 0);
  assert.equal(stats.cmi, 0);
  assert.equal(stats.isMythos, false);
  assert.equal(bookStats(null), null);
  assert.equal(bookStats({ type: 'weapon', system: {} }), null);
});

test('keeperHtml liefert SL-HTML und toleriert Fehlen', () => {
  assert.equal(keeperHtml(bookItem()), '<p>geheim</p>');
  assert.equal(keeperHtml({ system: { description: {} } }), '');
  assert.equal(keeperHtml(null), '');
  assert.equal(keeperHtml({ system: { description: { keeper: '  ' } } }), '');
});
