/**
 * Necronolib — Flags-Tests mit minimalem Foundry-Stub (kein echtes Foundry nötig).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getBookFlags, setBookFlags, FLAG_BOOK, FLAG_VERSION } from '../scripts/schema.mjs';

/** Minimaler JournalEntry-Stub: update() schreibt in ein flaches Objekt. */
function makeJournal(initialFlags = {}) {
  const doc = { name: 'Testbuch', flags: structuredClone(initialFlags), updates: [] };
  doc.update = async (data) => {
    doc.updates.push(data);
    for (const [key, value] of Object.entries(data)) {
      const parts = key.split('.'); // flags.necronolib.book → doc.flags.necronolib.book
      let target = doc;
      for (const p of parts.slice(0, -1)) target = (target[p] ??= {});
      target[parts.at(-1)] = value;
    }
  };
  return doc;
}

test('getBookFlags liefert bei leerem Journal das Default-Cover', () => {
  const c = getBookFlags(makeJournal());
  assert.equal(c.material, 'leather');
  assert.equal(c.palette, 'oxblood');
  assert.equal(c.wear, 'medium');
});

test('getBookFlags toleriert null/undefined', () => {
  assert.equal(getBookFlags(null).material, 'leather');
  assert.equal(getBookFlags(undefined).palette, 'oxblood');
});

test('getBookFlags liest gespeicherte Flags und normalisiert kaputte Werte', () => {
  const j = makeJournal({ necronolib: { book: { material: 'cloth', palette: 'navy', wear: 'sabotage' } } });
  const c = getBookFlags(j);
  assert.equal(c.material, 'cloth');
  assert.equal(c.palette, 'navy');
  assert.equal(c.wear, 'medium'); // repariert
});

test('setBookFlags schreibt normalisiertes Cover + Schema-Version', async () => {
  const j = makeJournal();
  const saved = await setBookFlags(j, { material: 'vellum', palette: 'ivory', title: { text: '  De Vermis  ' } });
  assert.equal(saved.material, 'vellum');
  assert.equal(saved.title.text, 'De Vermis');
  assert.equal(j.updates.length, 1);
  const update = j.updates[0];
  assert.equal(update[FLAG_BOOK].material, 'vellum');
  assert.equal(update[FLAG_BOOK].title.text, 'De Vermis');
  assert.equal(update[FLAG_VERSION], 1);
  // und zurücklesen
  assert.equal(getBookFlags(j).palette, 'ivory');
});

test('setBookFlags speichert keine unnormalisierten Werte', async () => {
  const j = makeJournal();
  await setBookFlags(j, { material: 'pappmaché', wear: 'apokalyptisch', clasps: 'gold' });
  const update = j.updates[0];
  assert.equal(update[FLAG_BOOK].material, 'leather');
  assert.equal(update[FLAG_BOOK].wear, 'medium');
  assert.equal(update[FLAG_BOOK].clasps, 'none');
});
