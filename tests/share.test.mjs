/**
 * Necronolib — Teilen/Leseansicht-Tests (pure).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeShare, sharedUserIds, isReaderOnlyFor, playersMissingAccess, LEVELS } from '../src/share/access.mjs';

test('computeShare: ausgewählte Spieler bekommen OBSERVER, Besitzer bleiben Besitzer', () => {
  const { ownership, users, changed } = computeShare({ default: 0, gm: 3, owner1: 3 }, ['p1', 'owner1']);
  assert.deepEqual(ownership, { default: 0, gm: 3, owner1: 3, p1: LEVELS.OBSERVER });
  assert.deepEqual(users, ['p1', 'owner1']);
  assert.equal(changed, true);
});

test('computeShare: abgewählte, früher geteilte Spieler verlieren den Eintrag', () => {
  const { ownership, users } = computeShare({ default: 0, p1: 2, p2: 2, p3: 2 }, ['p1'], ['p1', 'p2']);
  assert.deepEqual(ownership, { default: 0, p1: 2, p3: 2 }); // p3 nicht von uns geteilt → bleibt
  assert.deepEqual(users, ['p1']);
});

test('computeShare: höhere Rechte werden beim Abwählen nicht entfernt', () => {
  const { ownership } = computeShare({ p1: 3 }, [], ['p1']);
  assert.deepEqual(ownership, { p1: 3 });
});

test('computeShare: keine Änderung wird erkannt', () => {
  assert.equal(computeShare({ default: 0, p1: 2 }, ['p1'], ['p1']).changed, false);
});

test('computeShare verändert die Eingabe nicht', () => {
  const own = { p1: 2 };
  computeShare(own, [], ['p1']);
  assert.deepEqual(own, { p1: 2 });
});

test('sharedUserIds toleriert kaputte Flags', () => {
  assert.deepEqual(sharedUserIds(null), []);
  assert.deepEqual(sharedUserIds({ flags: { necronolib: { share: { users: 'x' } } } }), []);
  assert.deepEqual(sharedUserIds({ flags: { necronolib: { share: { users: ['a', 3, '', 'b'] } } } }), ['a', 'b']);
});

test('isReaderOnlyFor: nur geteilte Spieler ohne Besitzrecht', () => {
  const journal = { ownership: { default: 0, p1: 2, p2: 3 }, flags: { necronolib: { share: { users: ['p1', 'p2'] } } } };
  assert.equal(isReaderOnlyFor(journal, { id: 'p1' }), true);
  assert.equal(isReaderOnlyFor(journal, { id: 'p2' }), false); // Besitzer
  assert.equal(isReaderOnlyFor(journal, { id: 'p3' }), false); // nicht geteilt
  assert.equal(isReaderOnlyFor(journal, { id: 'p1', isGM: true }), false);
  assert.equal(isReaderOnlyFor(null, { id: 'p1' }), false);
});

test('playersMissingAccess: nur verbundene Spieler ohne Leserecht', () => {
  const users = [
    { id: 'gm', isGM: true, active: true },
    { id: 'a', active: true },
    { id: 'b', active: true },
    { id: 'c', active: false }
  ];
  const res = playersMissingAccess(users, u => u.id === 'a');
  assert.deepEqual(res.map(u => u.id), ['b']);
});
