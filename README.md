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
- [ ] Projektplan (`PROJECTPLAN.md`)
- [ ] v0.0.1 — Skeleton

## Umgebung

- Foundry VTT 14.364, CoC7-System 8.15 (optional — Kern soll systemagnostisch bleiben)
- Repo: privat, Installation manuell per Zip (privates Repo → kein Manifest-Install)

## Setup (Entwicklung)

```
<FoundryData>/Data/modules/necronolib/
```

Ordnername muss exakt `necronolib` sein. Nach Installation Foundry komplett neu starten (kein F5).
