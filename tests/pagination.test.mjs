/**
 * Necronolib — Reader-Pagination-Tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { visiblePages, buildSpreads, clampSpread, spreadLabel } from '../src/reader/pagination.mjs';

const page = (id, keeperOnly = false) => ({
  id,
  text: { content: `<p>Seite ${id}</p>` },
  flags: keeperOnly ? { necronolib: { keeperOnly: true } } : {}
});

test('visiblePages filtert keeperOnly-Seiten für Spieler', () => {
  const pages = [page('a'), page('b', true), page('c')];
  assert.equal(visiblePages(pages, { isGM: false }).length, 2);
  assert.equal(visiblePages(pages, { isGM: true }).length, 3);
  assert.deepEqual(visiblePages(pages, { isGM: false }).map(p => p.id), ['a', 'c']);
});

test('visiblePages toleriert fehlende flags und leere Liste', () => {
  assert.deepEqual(visiblePages([{ id: 'x' }], { isGM: false }), [{ id: 'x' }]);
  assert.deepEqual(visiblePages(null), []);
  assert.deepEqual(visiblePages(undefined, { isGM: true }), []);
});

test('buildSpreads: erste Seite rechts, danach Paare', () => {
  const pages = [page(1), page(2), page(3), page(4), page(5)];
  const spreads = buildSpreads(pages);
  assert.equal(spreads.length, 3);
  // Aufschlag 1: nur rechts Seite 1
  assert.equal(spreads[0].left, null);
  assert.equal(spreads[0].right.id, 1);
  assert.equal(spreads[0].leftNo, null);
  assert.equal(spreads[0].rightNo, 1);
  // 2–3, 4–5
  assert.equal(spreads[1].left.id, 2);
  assert.equal(spreads[1].right.id, 3);
  assert.equal(spreads[2].left.id, 4);
  assert.equal(spreads[2].right.id, 5);
});

test('buildSpreads: Seitenzahl gerade → letzte einzeln links, ungerade → voll', () => {
  // 4 Seiten: [1] [2,3] [4-links] — letzte einzeln LINKS (echtes Buch: S.4 linke Seite)
  const even = buildSpreads([page(1), page(2), page(3), page(4)]);
  assert.equal(even.length, 3);
  assert.equal(even[2].right, null);
  assert.equal(even[2].left.id, 4);
  // 5 Seiten: [1] [2,3] [4,5] — volle Doppelseite am Ende
  const odd = buildSpreads([page(1), page(2), page(3), page(4), page(5)]);
  assert.equal(odd.length, 3);
  assert.equal(odd[2].left.id, 4);
  assert.equal(odd[2].right.id, 5);
});

test('buildSpreads: leeres Buch → keine Aufschläge', () => {
  assert.deepEqual(buildSpreads([]), []);
  assert.deepEqual(buildSpreads(null), []);
});

test('clampSpread hält den Index im Bereich', () => {
  assert.equal(clampSpread(-5, 3), 0);
  assert.equal(clampSpread(1, 3), 1);
  assert.equal(clampSpread(99, 3), 2);
  assert.equal(clampSpread(0, 0), 0); // leeres Buch
  assert.equal(clampSpread(null, 3), 0);
});

test('spreadLabel formatiert Seitenzahlen', () => {
  assert.equal(spreadLabel({ leftNo: null, rightNo: 1 }), '1');
  assert.equal(spreadLabel({ leftNo: 2, rightNo: 3 }), '2–3');
  assert.equal(spreadLabel({ leftNo: 4, rightNo: null }), '4');
  assert.equal(spreadLabel(null), '');
});

test('visiblePages sortiert nach page.sort (stabil bei Gleichstand)', () => {
  const pages = [
    { id: 'c', sort: 300 }, { id: 'a', sort: 100 }, { id: 'b', sort: 200 }, { id: 'x' }, { id: 'y' }
  ];
  assert.deepEqual(visiblePages(pages, { isGM: true }).map(p => p.id), ['x', 'y', 'a', 'b', 'c']);
});

test('visiblePages respektiert canView (Foundry-Seitenrechte)', () => {
  const pages = [{ id: 'a', ok: true }, { id: 'b', ok: false }, { id: 'c', ok: true }];
  const res = visiblePages(pages, { isGM: false, canView: p => p.ok });
  assert.deepEqual(res.map(p => p.id), ['a', 'c']);
});

test('visiblePages verändert die Eingabeliste nicht', () => {
  const pages = [{ id: 'b', sort: 2 }, { id: 'a', sort: 1 }];
  visiblePages(pages);
  assert.deepEqual(pages.map(p => p.id), ['b', 'a']);
});

test('clampSpread toleriert NaN/Strings/Brüche (Socket-Payloads)', () => {
  assert.equal(clampSpread(Number.NaN, 3), 0);
  assert.equal(clampSpread('2', 3), 0);
  assert.equal(clampSpread(Infinity, 3), 0);
  assert.equal(clampSpread(1.7, 3), 1);
  assert.equal(clampSpread(1, Number.NaN), 0);
});

test('spreadIndexOfPage findet den Spread einer Seite', async () => {
  const { spreadIndexOfPage } = await import('../src/reader/pagination.mjs');
  const spreads = buildSpreads([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
  assert.equal(spreadIndexOfPage(spreads, 'a'), 0);
  assert.equal(spreadIndexOfPage(spreads, 'c'), 1);
  assert.equal(spreadIndexOfPage(spreads, 'd'), 2);
  assert.equal(spreadIndexOfPage(spreads, 'zz'), -1);
});
