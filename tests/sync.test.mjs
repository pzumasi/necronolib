/**
 * Necronolib — Socket-Sync-Tests (Guard-Logik, ohne Foundry).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isReaderEvent, SOCKET_SCOPE } from '../scripts/sync.mjs';

test('isReaderEvent akzeptiert gültige goto/share-Events', () => {
  assert.equal(isReaderEvent({ type: 'reader', action: 'goto', journalUuid: 'JournalEntry.abc', spread: 2 }), true);
  assert.equal(isReaderEvent({ type: 'reader', action: 'share', journalUuid: 'JournalEntry.abc', share: true }), true);
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
