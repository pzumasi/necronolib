/**
 * Necronolib — Socket-Layer (geteiltes Lesen).
 * Core-Socket-API (module.json: "socket": true), kein socketlib nötig.
 * GM blättert → alle Clients mit geöffnetem Reader folgen.
 */
import { isValidSocketPayload } from '../src/reader/paginate.mjs';

const CHANNEL = 'module.necronolib';

/** @type {Map<string, (payload) => void>} Handler je msgType */
const HANDLERS = new Map();

/**
 * Empfänger registrieren (idempotent — mehrfaches init überschreibt).
 * @param {(msgType: string, payload: object) => void} dispatch
 */
export function initSocket(dispatch) {
  if (!game.socket) {
    console.warn('necronolib | kein game.socket — geteiltes Lesen deaktiviert');
    return;
  }
  game.socket.on(CHANNEL, (payload) => {
    if (!isValidSocketPayload(payload)) return;
    dispatch(payload.msgType, payload);
  });
}

/**
 * Page-Turn broadcasten. Senderecht: GM immer, Spieler nur wenn erlaubt.
 * @param {string} journalUuid
 * @param {number} spread
 */
export function emitTurn(journalUuid, spread) {
  if (!canBroadcast()) return false;
  game.socket?.emit(CHANNEL, { msgType: 'turn', journalUuid, spread, by: game.user.id });
  return true;
}

/**
 * "Öffnet das Buch bei den Spielern" broadcasten (GM only).
 * @param {string} journalUuid
 */
export function emitOpen(journalUuid) {
  if (!game.user.isGM || !game.socket) return false;
  game.socket.emit(CHANNEL, { msgType: 'open', journalUuid, by: game.user.id });
  return true;
}

/** Darf der lokale User Page-Turns senden? */
export function canBroadcast() {
  if (!game.socket) return false;
  if (game.user.isGM) return true;
  return Boolean(game.settings.get('necronolib', 'allowPlayerTurns'));
}

/** Sollen empfangene Turns angewendet werden (Setting + eigener Turn)? */
export function shouldFollow(payload) {
  if (payload.by === game.user.id) return false; // eigener Turn
  if (game.user.isGM) return Boolean(game.settings.get('necronolib', 'sharePageTurns'));
  return true; // Spieler folgen immer
}

export const SOCKET_CHANNEL = CHANNEL;
