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

### Phase 1 — Datenmodell & Cover-Prototyp
- flags-Schema definieren (`flags.necronolib`), Defaults + Migration-Hook
- Prozedurales Cover: CSS-Material-Layer (Leder/Lack/Pergament/Stoff), SVG-Prägung/Titel, Buchrücken
- Cover-Designer **lite** (AppV2-Dialog): Material, Farbe, Titel, Schließen-Effekte → Live-Vorschau
- Verifizierung: Cover wird im Journal-Sheet-Header als Vorschau gerendert

### Phase 2 — Reader (MVP-Kern)
- Vollbild-Reader-AppV2: Doppelseite, Aufschlag-Animation, Blättern (Buttons + Pfeiltasten)
- Inhalt aus JournalEntryPages rendern (ProseMirror-HTML, Bilder, Tabellen)
- **Geteiltes Lesen**: Socket-Sync (SL steuert, Spieler folgen; Toggle im Reader)
- GM-only-Seiten (via `flags.necronolib.page.keeperOnly`) für Spieler ausgeblendet
- Verifizierung: 2 Browser-Sessions (SL + Spieler), Sync + Rechte manuell testen

### Phase 3 — CoC7-Brücke
- Journal ↔ `book`-Item verknüpfen (UUID im Flag)
- Reader-Aktionsleiste bei verknüpftem Item: Initial Reading / Sanity / Study-Progress — Aufruf der CoC7-Systemmechanik, Anzeige aus `system` (sanityLoss, mythosRating, gains)
- Keeper-Inhalte (`description.keeper`) im Reader als SL-Seite
- Verifizierung: Test-Actor mit Buch-Item, e2e der Buttons in Testwelt

### Phase 4 — Atelier (voller Designer)
- Proportionen, Dicke, Buchrücken-Stile, Klappen, Eckbeschläge, Metallteile, Ketten
- Frei platzierbare Embleme (SVG-Generator + Upload): verschieben/skalieren/rotieren
- Texturen/Wear-Overlays prozedural; Titelfont/Größe/Position; eigenes Cover-Bild
- Seiten-Editor-Erweiterungen: Fließtext um Illustrationen, Divider

### Phase 5 — Release v0.1.0
- Zip-Build (tar, module.json im Zip-Root), Tests, README/INSTALL
- Installation auf Foundry-Host (manuell — privates Repo → kein Manifest-Install)
- Entscheidung zuordnen: ob + wo veröffentlicht wird (separater Auftrag)

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
