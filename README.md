# Necronolib — Books & Tomes Atelier

Open-Source-Nachbau von [The Bindery](https://foundryvtt.com/packages/bindery) (Origin Studios, Patreon-gated) — mit Fokus auf **Call of Cthulhu 7E** (CoC7-System).

## Ziel

Bücher und Mythos-Tome in Foundry VTT gestalten und erleben:

- **Cover-Atelier**: Prozedurale Buchdecken (Proportionen, Materialien, Beschläge, Embleme) + eigene Bilder
- **Seiten-Editor**: Text, Bilder, Tabellen, Fließtext um Illustrationen
- **Immersiver Reader**: Umblättern, geteiltes Lesen mit Spielern (Socket), SL-only-Inhalte
- **CoC7-Integration**: Verknüpfung mit dem nativen `book`-Item (Sanity Loss, Initial Reading, Studium, Sprüche)

## Status

- [x] Recherche Bindery + CoC7-Buchdatenmodell (`docs/recherche-bindery.md`)
- [x] Projektplan (`PROJECTPLAN.md`)
- [x] Phase 1 — Cover-Modell + prozedurale Covers + Atelier lite (21 Tests grün, visuell verifiziert)
- [x] Phase 2 — Reader (geschlossenes Buch, Doppelseiten, Folios, Socket-Vorlesen)
- [x] Phase 3 — CoC7-Brücke (Link, Chips, Erstlesung/Nachschlagen)
- [x] v0.1.0 Release (38 Tests grün) — [Releases](https://github.com/pzumasi/necronolib/releases)
- [x] Review 27.09.2026 — Bugfixes, Sicherheits-Härtung, Features (siehe `PROJECTPLAN.md` → „Review 2026-09-27“)
- [x] v0.2.0 Release (51 Tests grün) — Build/Release per GitHub Action bei Tag-Push
- [x] v0.2.1 Hotfix Atelier (`selected`-Helper fehlt in v14)
- [x] v0.3.0 Anzeigen/Teilen, Import/Export, Runenschrift, Atelier-Layout (72 Tests)
- [ ] Foundry-Host-Spike (Installation + Testwelt)

## Installation (testbereit)

**Per Manifest (Repo öffentlich):** Foundry → Add-on-Module → Modul installieren → Manifest-URL
`https://github.com/pzumasi/necronolib/releases/latest/download/module.json`

**Manuell (auch bei privatem Repo):** Release-Zip `necronolib.zip` von der [Release-Seite](https://github.com/pzumasi/necronolib/releases/latest)
nach `<FoundryData>/Data/modules/necronolib/` entpacken (Ordnername exakt `necronolib`),
Foundry komplett neu starten, Modul in der Welt aktivieren.

- Ohne CoC7: Cover + Reader funktionieren systemagnostisch
- Reader: Buch anklicken oder Pfeiltasten/Bild↑↓ zum Blättern; SL kann je Seite „nur Spielleitung“ umschalten (Auge-Button)
- **Anzeigen** (SL): öffnet das Buch bei allen verbundenen Spielern, sie folgen dem Umblättern
- **Teilen** (SL): ausgewählte Spieler bekommen dauerhaft Zugriff im Notizbuch-Tab — nur Leseansicht
- **Import/Export** (SL): Button „Buch importieren“ im Notizbuch-Tab, Export per Rechtsklick — Format siehe `.claude/skills/necronolib-book-import/SKILL.md`
- Mit CoC7: zusätzlich Verknüpfungs-Dropdown (Atelier) + Statistik/Aktionen im Reader

## Entwicklung

```powershell
npm test              # 72 Unit-Tests (node --test)
node tools/preview.mjs        # Cover-Matrix als HTML generieren (tools/preview.html)
node tools/reader-preview.mjs # Reader-Zustände als HTML generieren (tools/reader-preview.html)
npm run build                 # dist/necronolib.zip + dist/module.json (mit Import-/Manifest-/Font-Check)
npm run validate -- x.json    # Necronolib-Buchdatei vor dem Import prüfen
```

## Release

1. `version` + `download`-URL in `module.json` (und `package.json`) anheben, `RELEASE_NOTES.md` schreiben
2. Committen und pushen (main oder `claude/**`) — alternativ Tag `v0.2.0` pushen oder Workflow manuell starten
3. GitHub Action `.github/workflows/release.yml` erkennt die neue Version, testet, baut und erstellt Tag + Release
   mit `module.json` + `necronolib.zip` (existiert das Release schon, passiert nichts)

## Umgebung

- Foundry VTT 14.364, CoC7-System 8.15 (optional — Kern soll systemagnostisch bleiben)
- Repo: privat → Manifest-Install nur, wenn öffentlich; sonst Zip manuell

## Setup (Entwicklung)

```
<FoundryData>/Data/modules/necronolib/
```

Ordnername muss exakt `necronolib` sein. Nach Installation Foundry komplett neu starten (kein F5).

## Credits

- Runenschrift **Da Rune** von Daniel Riantsoatahina (Dany Pool) — https://www.dafont.com/daniel-riantsoatahina.d11012 ·
  Nutzung mit Erlaubnis des Autors für dieses private, nicht-kommerzielle Projekt (Details: `fonts/README.md`)
