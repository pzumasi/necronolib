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
- [ ] Phase 2 — Reader (Doppelseite, Umblättern, Socket-Sync)
- [ ] Phase 3 — CoC7-Brücke

## Entwicklung

```powershell
npm test              # 21 Unit-Tests (node --test)
node tools/preview.mjs # Cover-Matrix als HTML generieren (tools/preview.html)
```

## Umgebung

- Foundry VTT 14.364, CoC7-System 8.15 (optional — Kern soll systemagnostisch bleiben)
- Repo: privat, Installation manuell per Zip (privates Repo → kein Manifest-Install)

## Setup (Entwicklung)

```
<FoundryData>/Data/modules/necronolib/
```

Ordnername muss exakt `necronolib` sein. Nach Installation Foundry komplett neu starten (kein F5).
