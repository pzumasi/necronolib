## v0.2.0 — Review-Release (Bugfixes, Härtung, Features)

**Installation in Foundry (Repo muss öffentlich sein):** Add-on-Module → Modul installieren → Manifest-URL:
`https://github.com/pzumasi/necronolib/releases/latest/download/module.json`
Alternativ `necronolib.zip` manuell nach `<FoundryData>/Data/modules/necronolib/` entpacken.

### Bugfixes
- Geteiltes Lesen: `"socket": true` im Manifest ergänzt (Socket-Kanal war nie aktiv)
- Kontextmenü „Buch lesen“ / „Cover gestalten“ erscheint wieder (v13+/v14-Hook `getJournalEntryContextOptions`)
- Atelier: Live-Vorschau funktioniert ab dem ersten Öffnen (Titel, Schrift, Effekt, Position, Titel ↔ Runen)
- Reader: Seitenreihenfolge nach Journal-Sortierung; lange Seiten werden nicht mehr oben abgeschnitten
- Atelier: Verknüpfung zu Actor-Büchern bleibt beim Speichern erhalten

### Sicherheit
- Spieler sehen nur Seiten mit Beobachter-Recht; `Secret`-Blöcke nur für Besitzer
- Socket folgt nur Events der Spielleitung; Payloads werden typgeprüft

### Neu
- SL-only-Umschalter je Seite im Reader
- Vorlesen öffnet das Buch bei berechtigten Spielern automatisch
- Reader aktualisiert sich live bei Journal-Änderungen
- Blättern mit Pfeiltasten / Bild↑↓; Bild-Seiten und Seitentitel
- Atelier: „Verwerfen“, Titel live beim Tippen

51 Unit-Tests grün. **Noch nicht in echtem Foundry v14 getestet** — dieses Release ist für den Host-Test gedacht.
