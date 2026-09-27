/**
 * Necronolib — Socket-Sync (geteiltes Lesen).
 * module.json deklariert "socket": true; dünne Wrapper + Typen.
 * Ideen aus dem Parallel-Entwurf (scripts/socket.mjs): by-Attribution,
 * JournalEntry-Prefix-Härtung.
 */

export const SOCKET_SCOPE = 'module.necronolib';

/**
 * Reader-Ereignis an alle anderen Clients senden.
 * @param {{action: 'goto'|'show', journalId?: string, journalUuid: string,
 *          spread?: number, show?: boolean, by?: string}} payload
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
 * fremde/manipulierte Events auf dem Kanal); spread muss – falls gesetzt –
 * eine ganze Zahl ≥ -1 sein; show – falls gesetzt – ein Boolean.
 * @returns {boolean} true wenn payload ein gültiges Reader-Event ist
 */
export function isReaderEvent(data) {
  return Boolean(
    data
    && data.type === 'reader'
    && (data.action === 'goto' || data.action === 'show')
    && typeof data.journalUuid === 'string'
    && data.journalUuid.startsWith('JournalEntry.')
    && (data.spread === undefined || (Number.isInteger(data.spread) && data.spread >= -1))
    && (data.show === undefined || typeof data.show === 'boolean')
  );
}

/**
 * Stammt das Event (laut `by`) von einem GM?
 * Hinweis: Foundry-Modul-Sockets liefern keine server-authentifizierte
 * Absender-ID; `by` ist client-seitig gesetzt. Der Check verhindert
 * versehentliche/naive Fremdsteuerung durch Spieler-Clients, ist aber keine
 * kryptografische Garantie. Die Auswirkung ist auf Umblättern begrenzt;
 * Seiteninhalte werden immer lokal nach eigenen Rechten gefiltert.
 * @param {object} data Reader-Event
 * @param {{get: (id: string) => ({isGM?: boolean}|undefined)}} users z. B. game.users
 */
export function isFromGM(data, users) {
  if (typeof data?.by !== 'string' || !data.by) return false;
  return Boolean(users?.get?.(data.by)?.isGM);
}
