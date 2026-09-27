# Necronolib — Projektplan

Stand: 2026-09-19 · Entscheidungen geklärt (siehe unten)

## Ziel

Open-Source-Nachbau von The Bindery (Origin Studios) mit CoC7-Fokus:
Bücher gestalten, erleben und teilen — Reader-Erlebnis zuerst, volles Cover-Atelier danach.

## Getroffene Entscheidungen (19.09.2026)

| Frage | Entscheidung |
|---|---|
| MVP-Kern | **Reader zuerst**: Aufschlag, Umblättern, geteiltes Lesen + einfacher Cover-Designer; volles Atelier später |
| Speicher | **Foundry-JournalEntry + eigene Sheet/PageTypes via `flags.necronolib`** (nativ, kompatibel, keine eigene Document-Klasse) |
| Cover-Grafik | **Prozedural: CSS-Layer + SVG** — Materialien, Prägung, Beschläge, Embleme generiert; kein Asset-Download, alles im Repo |
| CoC7-Kopplung | **Systemagnostischer Kern + optionale CoC7-Brücke** (`relationships.systems` mit `optional: true`) |

## Architektur (Überblick)

```
JournalEntry (foundry-nativ)
 ├─ pages: JournalEntryPage[]          ← Inhalt (Text/Bilder/Tabellen)
 ├─ flags.necronolib.book:
 │   ├─ cover: { material, color, wear, title: {text,font,pos}, emblems[], clasps… }
 │   ├─ layout: { thickness, proportions, spine }
 │   └─ link: { coc7BookUuid }         ← optionale CoC7-Brücke
 ├─ NecronolibReader (AppV2)           ← Lese-Erlebnis, Socket-Sync
 └─ NecronolibAtelier (AppV2)          ← Cover-/Layout-Editor
```

- Zwei Apps (wie Bindery: `bindery.css` + `ephemera-reader.css`): **Reader** + **Atelier**, getrennte CSS-Dateien
- Socket (`"socket": true` in module.json): SL blättert → Spieler-Follower bekommen Seitenwechsel synchron
- CoC7-Brücke: Reader zeigt Mechanik-Buttons nur bei verknüpftem `book`-Item; delegiert an CoC7-System-API (`attemptInitialReading`, Sanity etc. — Mechanik NICHT neu erfinden; Quelle: `book-system.js`, entwickelt gegen 8.15)

## Phasen

### Phase 0 — Skeleton ✅ (erledigt)
- [x] Repo privat (github.com/pzumasi/necronolib), lokal `E:\Agents\necronolib`
- [x] module.json (v14, CoC7 optional, socket), Entry-ES-Modul, Styles, lang/de+en
- [x] Recherche-Doku `docs/recherche-bindery.md`

### Phase 1 — Datenmodell & Cover-Prototyp ✅ (erledigt 20.09.2026)
- [x] flags-Schema definieren (`flags.necronolib.book`), Defaults + Schema-Version 1
- [x] Prozedurales Cover: CSS-Material-Layer (Leder/Lack/Pergament/Stoff), Titel-Effekte (Vergoldung/Prägung/Tinte), Buchrücken, Buchblock-Schnitt, Abnutzung, Schließen, prozedurale Runen für titellose Bücher
- [x] Cover-Designer **lite** (AppV2): Material, Palette, Wear, Dicke, Schließen, Titel (Text/Font/Effekt/Position) → Live-Vorschau ohne Re-Render; Kontextmenü-Eintrag im Journal-Verzeichnis (GM-only)
- [x] Verifizierung: 21 Node-Tests grün; visuelle QA über Handlebars-Preview-Harness (`tools/preview.mjs`) + Screenshot-Review — 3 gefundene Bugs (Wortumbruch, Ink-Kontrast auf dunklem Stoff, fehlende Runen) gefixt und re-verifiziert
- [ ] Journal-Sheet-Header-Vorschau → mit Phase 2 (Reader-Aufschlag nutzt dasselbe Partial)

### Phase 2 — Reader (MVP-Kern) ✅ (erledigt 20.09.2026)
- [x] Reader-AppV2: geschlossenes Buch → „Buch öffnen" → Doppelseiten (erste Seite rechts, Folio-Nummern auf dem Papier)
- [x] Inhalt aus JournalEntryPages (text.content-HTML), keeperOnly-Seiten nur für GM (`flags.necronolib.page.keeperOnly` → Filter in `visiblePages`)
- [x] Geteiltes Lesen: Socket-Kanal `module.necronolib`, GM-Toggle „Vorlesen", Echo-Guard + JournalEntry-Prefix-Härtung
- [x] Verifizierung: Pagination/Socket-Guard-Tests; visuelle QA (Playwright): Buttons themenkonform, kein Text-Clipping, Folios + Falz per DOM-Check bestätigt

### Phase 3 — CoC7-Brücke ✅ (erledigt 20.09.2026)
- [x] Journal ↔ `book`-Item verknüpfen (UUID im Flag `flags.necronolib.link.coc7BookUuid`, Dropdown im Atelier)
- [x] Statistik-Chips im Reader (Mythos/Okkult, STA-Verlust, Mythos-Wert, CMI/CMF, Studium)
- [x] Aktionsbuttons Erstleseversuch/Nachschlagen — Delegation an `item.system.attemptInitialReading()/attemptReference()` (nur GM, nur bei Actor-gebundenem Item)
- [x] `description.keeper` als SL-Notiz-Block im Reader

### Phase 4 — Atelier (voller Designer)
- Proportionen, Dicke, Buchrücken-Stile, Klappen, Eckbeschläge, Metallteile, Ketten
- Frei platzierbare Embleme (SVG-Generator + Upload): verschieben/skalieren/rotieren
- Texturen/Wear-Overlays prozedural; Titelfont/Größe/Position; eigenes Cover-Bild
- Seiten-Editor-Erweiterungen: Fließtext um Illustrationen, Divider

### Phase 5 — Release v0.1.0 ✅ (erledigt 20.09.2026)
- [x] Zip-Build per Python (module.json im Root, src/ enthalten, Import-Check im Zip), 18 Dateien
- [x] GitHub-Release v0.1.0 mit Zip + module.json (privates Repo → Installation manuell)
- [ ] Installation auf Foundry-Host + Testwelt-Spike (User)

## Review 2026-09-27 (Bugs · Sicherheit · Features)

**Bugs (gefixt)**
- `module.json` ohne `"socket": true` → Vorlesen/Socket-Sync ging nie über den Modul-Kanal (Bindery-Manifest nutzt das Flag, siehe `docs/recherche-bindery.md`; socketlib-Doku verlangt es ebenso)
- Kontextmenü-Hook `getJournalEntryContext` existiert seit v13 nicht mehr → Einträge „Buch lesen“/„Cover gestalten“ fehlten; jetzt `getJournalEntryContextOptions` mit v14-Feldern `label/visible/onClick` (foundryvtt/foundryvtt#12335)
- Atelier: Feld-Listener wurden erst nach dem *zweiten* Render gesetzt (Live-Vorschau beim ersten Öffnen tot) → `_onRender`
- Live-Vorschau: `applyCover` suchte `[data-nl-title]` (fehlte im Partial) und setzte data-Attribute, CSS nutzt aber Klassen → Titel/Schrift/Effekt/Position änderten sich nicht; Titel ↔ Runen jetzt per `hidden`-Toggle
- Seitenreihenfolge ignorierte `page.sort`
- `clampSpread` lieferte `NaN` bei nicht-numerischen Socket-Werten
- Layout: zweite `.nl-spread`-Regel (necronolib.css, `align-items: center`) ließ lange Seiten über die Bühne wachsen → oberer Text abgeschnitten, nicht scrollbar
- Atelier: Verknüpfung auf Actor-Buch fehlte im Dropdown → Speichern löste sie stillschweigend; Speichern jetzt als *ein* Update
- Stale Instanzen: Reader/Atelier-Map wird beim Schließen bereinigt (ungespeicherte Atelier-Änderungen überlebten Schließen)

**Sicherheit (gehärtet)**
- Reader zeigte Spielern Seiten ohne OBSERVER-Recht und `<section class="secret">`-Blöcke → Seitenrechte-Filter + `TextEditor.enrichHTML({secrets: page.isOwner})`
- Socket: nur Events von GM-Usern werden befolgt; `spread`/`share` typgeprüft. Hinweis: Modul-Sockets liefern keine server-authentifizierte Absender-ID (fbl-vn PR #4), `by` ist spoofbar — Auswirkung auf Umblättern begrenzt, Inhalte immer lokal nach eigenen Rechten gefiltert
- CoC7-Link: nur auf existierende `book`-Items speicherbar; CoC7-Aktionen zusätzlich GM-geprüft

**Features (neu)**
- SL-only-Umschalter je Seite im Reader (Flag `flags.necronolib.keeperOnly` an der JournalEntryPage)
- Vorlesen öffnet den Reader bei berechtigten Spielern automatisch; „Vorlesen aus“/Schließen beendet das Folgen
- Reader aktualisiert sich live bei Journal-/Seitenänderungen; schließt bei Journal-Löschung
- Pfeiltasten/Bild↑↓ zum Blättern; Bild-Seiten (mit Bildunterschrift) + Seitentitel (`title.show/level`); Hinweis für nicht unterstützte Seitentypen
- Atelier: „Verwerfen“ (gespeicherten Stand laden), Titel live beim Tippen, Fenstertitel mit Journalnamen
- Tests 38 → 51: Manifest/i18n-Parität/alle genutzten Lang-Keys/Template-Kompilierung, Pagination, Socket-Guards, Live-Toggle

**Offen (bewusst nicht angefasst)**
- necronolib.css enthält alte Reader-Regeln aus dem Parallel-Entwurf (`.nl-spread-pages`, `.nl-page[data-side]` …) — tot, aber Aufräumen erst nach Foundry-Spike
- Alles oben ist nur per Node-Tests + Preview-Harness verifiziert, **nicht in echtem Foundry v14** (Host-Spike steht aus)

## Release v0.2.0 (27.09.2026)
- version 0.2.0, download-URL auf v0.2.0; `npm run build` (tools/build-zip.mjs: Manifest-/Import-/Tag-Check, 18 Dateien)
- Release per GitHub Action bei Versionsänderung in module.json (Push), Tag-Push `v*` oder manuell; idempotent (`.github/workflows/release.yml`, Assets module.json + necronolib.zip, Text aus RELEASE_NOTES.md)
- Tag v0.2.0 zeigt auf den Branch `claude/adoring-tesla-6vg29k` (main noch nicht gemergt)
- Nächster Schritt (User): Repo öffentlich → Manifest-Install in Foundry v14 → Host-Test

## Hotfix v0.2.1 (27.09.2026) — erster Live-Test Foundry v14
- Live-Test User: „Buch lesen“ funktioniert; „Cover gestalten“ warf `Missing helper: "selected"` → Helper existiert in v14 nicht
- Fix: selected-Flag in den Options-Objekten (atelier.mjs), Template ohne Helper; Regressionstest (knownHelpersOnly + Render)
- Lehre: Preview-Harnesses dürfen keine Helper registrieren, die Foundry nicht hat

## v0.3.0 (27.09.2026) — Feedback aus dem Live-Test
- Atelier: Foundry stylt `.window-content` als Flex-Spalte (höhere Spezifität) → Layout in eigenes `.nl-atelier-body`; Fenster 860×640, Body scrollt, Vorschau 290×400 zentriert
- Runenschrift „Da Rune“ (Daniel Riantsoatahina) gebündelt — Lizenz dafont „free for personal use“, **Erlaubnis des Autors vom User eingeholt** (27.09.2026), Attribution in `fonts/README.md`, README, CSS
- Reader: geschlossenes Buch klickbar (+ Enter/Leertaste), Hinweistext neu
- SL-Buttons neu definiert: **Anzeigen** (verbundene Spieler, Leseansicht, folgen Umblättern; Socket-Aktion `show`, ersetzt `share`) und **Teilen** (Dialog mit Checkboxen, OBSERVER + `flags.necronolib.share.users`, Leseansicht-Zwang via Patch von `JournalEntrySheet/PageSheet.render`)
- Import/Export: Format `necronolib-book` v1 (`src/io/book-format.mjs`), Foundry-Teil `scripts/io.mjs`, Skill `.claude/skills/necronolib-book-import/SKILL.md`, Validator `npm run validate`, Beispiel `docs/examples/`
- Offen/ungetestet live: Sheet-Umleitung (Klassennamen v14), DialogV2-Formzugriff, `recursive:false`-Ownership-Update, Showdown-Global für Markdown

## Risiken & Offenpunkte

- **v14-AppV2/Sockets**: Socket-Muster in Testwelt spike-testen, bevor Phase 2 voll ausgebaut wird
- **Private Repo → 404 bei Manifest-Install** (bekanntes Problem): Installation manuell per Zip
- **CoC7-Updates**: Brücke gegen 8.15 gebaut; interne APIs (`CoC7ModelsItemBookSystem`) können sich ändern → defensive Checks (`game.system.id === "CoC7"`, try/catch)
- **Performance** bei sehr vielen Seiten: Lazy-Rendering (nur sichtbare Doppelseite)
- Open: Ton/Papier-Geräusch beim Umblättern (nice-to-have, Phase 2+)
- Open: Deutsche UI zuerst; EN-Lang-Datei als Gerüst gepflegt

## Quellen

- `docs/recherche-bindery.md` (Bindery-Fakten, Manifest-Analyse, CoC7-Buchschema)
- foundry-module-builder-Skill (v14-Manifest, AppV2, Release-Workflow)
- CoC7-Repo: `coc7/models/item/book-system.js` (Schema + Mechanik-Aufrufe)
