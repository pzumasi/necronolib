# Archivierte Entwurfs-Artefakte (429-Degeneration)

`scripts/socket.mjs` und `src/reader/paginate.mjs` (plus zusätzliche i18n-Keys)
entstanden am 20.09.2026 als **Degenerations-Artefakte eigener API-Calls**:
Bei Provider-429s wurden Schreibvorgungen mit abweichendem/divergierendem Inhalt
ausgeführt (gleicher Effekt wie die früher beschädigte CSS-Datei). Es gab keine
Parallel-Entwicklung — nur Retries mit anderem Generierungsstand.

Die Ideen, die trotzdem gut waren, sind in den Haupt-Code übernommen:

- `by`-Attribution in Socket-Events + Echo-Guard (`scripts/sync.mjs`, `reader.mjs`)
- `JournalEntry.`-Prefix-Härtung im Event-Guard
- i18n-Keys (`ReadBook`, `Reader.Share*`, `Coc7.InitialReading/Reference`) als Kanon
- Geschlossenes-Buch-Zustand im Reader (`kind: 'cover'` → `isClosed`)

Hier nur als Referenz archiviert (enthält zusätzlich `allowPlayerTurns`-Setting,
`spreadForPage`-Navigation als mögliche spätere Features). **Nicht importieren.**

Lehre: Nach sichtbaren 429-Fehlern Dateien aktiv verifizieren
(Syntax-Check, Fremd-Marker, Git-Diff gegen Erwartung), statt Herkünfte zu raten.
