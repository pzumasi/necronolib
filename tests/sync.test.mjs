/**
 * Necronolib — Socket-Sync-Tests (Guard-Logik, ohne Foundry).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isReaderEvent, SOCKET_SCOPE } from '../scripts/sync.mjs';

test('isReaderEvent akzeptiert gültige goto/show-Events', () => {
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: 'JournalEntry.abc', spread: 2 }), true);
  assert.equal(isReaderEvent({ type: 'reader', action: 'show', journalUuid: 'JournalEntry.abc', show: true }), true);
});

test('isReaderEvent lehnt ungültige Payloads ab', () => {
  assert.equal(isReaderEvent(null), false);
  assert.equal(isReaderEvent({}), false);
  assert.equal(isReaderEvent({ type: 'other', action: 'goto', journalUuid: 'JournalEntry.abc' }), false);
  assert.equal(isReaderEvent({ type: 'reader', action: 'destroy', journalUuid: 'JournalEntry.abc' }), false);
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: 42 }), false);
});

test('isReaderEvent verlangt JournalEntry-Prefix (Härtung)', () => {
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: 'Item.xyz' }), false);
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: '' }), false);
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: 'Actor.evil' }), false);
});

test('Socket-Kanal ist stabil', () => {
  assert.equal(SOCKET_SCOPE, 'module.necronolib');
});

test('isReaderEvent validiert spread und show', () => {
  const base = { type: 'reader', action: 'goto', journalUuid: 'JournalEntry.abc' };
  assert.equal(isReaderEvent({ ...base, spread: -1 }), true);
  assert.equal(isReaderEvent({ ...base, spread: -2 }), false);
  assert.equal(isReaderEvent({ ...base, spread: '3' }), false);
  assert.equal(isReaderEvent({ ...base, spread: 1.5 }), false);
  assert.equal(isReaderEvent({ ...base, spread: Number.NaN }), false);
  assert.equal(isReaderEvent({ ...base, action: 'show', show: 'yes' }), false);
});

test('isFromGM akzeptiert nur Events bekannter GM-User', async () => {
  const { isFromGM } = await import('../scripts/sync.mjs');
  const users = new Map([['gm1', { isGM: true }], ['pl1', { isGM: false }]]);
  assert.equal(isFromGM({ by: 'gm1' }, users), true);
  assert.equal(isFromGM({ by: 'pl1' }, users), false);
  assert.equal(isFromGM({ by: 'ghost' }, users), false);
  assert.equal(isFromGM({}, users), false);
  assert.equal(isFromGM({ by: 'gm1' }, null), false);
});

test('isReaderEvent lehnt das alte share-Event ab (umbenannt in show)', () => {
  assert.equal(isReaderEvent({ type: 'reader', action: 'share', journalUuid: 'JournalEntry.abc', share: true }), false);
});
