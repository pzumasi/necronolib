/**
 * Necronolib — Socket-Sync (geteiltes Lesen).
 * module.json deklariert "socket": true; dünne Wrapper + Typen.
 * Ideen aus dem Parallel-Entwurf (scripts/socket.mjs): by-Attribution,
 * JournalEntry-Prefix-Härtung.
 */

export const SOCKET_SCOPE = 'module.necronolib';

/**
 * Reader-Ereignis an alle Clients senden.
 * @param {{action: 'goto'|'share', journalId?: string, journalUuid: string,
 *          spread?: number, share?: boolean, by?: string}} payload
 */
export function emitReaderEvent(payload) {
  if (typeof game === 'undefined' || !game.socket) return false;
  game.socket.emit(SOCKET_SCOPE, { type: 'reader', by: game.user?.id, ...payload });
  return true;
}

/** Handler für eingehende Socket-Nachrichten registrieren. */
export function onSocket(handler) {
  if (typeof game === 'undefined' || !game.socket) return false;
  game.socket.on(SOCKET_SCOPE, handler);
  return true;
}

/**
 * Guard für Reader-Nachrichten (reine Validierung, testbar).
 * Härtung: journalUuid muss mit "JournalEntry." beginnen (verhindert
 * fremde/manipulierte Events auf dem Kanal).
 * @returns {boolean} true wenn payload ein gültiges Reader-Event ist
 */
export function isReaderEvent(data) {
  return Boolean(
    data
    && data.type === 'reader'
    && (data.action === 'goto' || data.action === 'share')
    && typeof data.journalUuid === 'string'
    && data.journalUuid.startsWith('JournalEntry.')
  );
}
