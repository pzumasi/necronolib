# Parallel-Entwurf (nicht verdrahtet)

Am 20.09.2026 tauchten im Arbeitsbaum zwei Dateien auf, die nicht aus der
Hermes-Session stammten: `scripts/socket.mjs` und `src/reader/paginate.mjs`
(dazu i18n-Keys in `lang/*.json`, die übernommen wurden). Sie beschreiben einen
stimmigen alternativen Entwurf, sind aber nicht mit der verdrahteten
Architektur kompatibel (andere Export-Namen, Settings-Namen, Spread-Modell
mit `kind: 'cover'`).

Übernommen in den Haupt-Code:

- `by`-Attribution in Socket-Events + Echo-Guard (`scripts/sync.mjs`, `reader.mjs`)
- `JournalEntry.`-Prefix-Härtung im Event-Guard
- i18n-Keys (`ReadBook`, `Reader.Share*`, `Coc7.InitialReading/Reference`) als Kanon

Hier konserviert als Referenz für künftige Iterationen (z. B.
`allowPlayerTurns`-Setting, `spreadForPage`-Navigation). Nicht importieren —
die Dateien sind nicht an den Entry angebunden.
