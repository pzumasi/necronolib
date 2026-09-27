## v0.3.0 — Anzeigen/Teilen, Import/Export, Runenschrift, Atelier-Layout

**Update in Foundry:** Modul „Aktualisieren“ (Manifest-URL unverändert:
`https://github.com/pzumasi/necronolib/releases/latest/download/module.json`), danach Foundry neu starten.

### Neu
- **Anzeigen / Nicht mehr anzeigen** (SL, Reader-Leiste): öffnet das Buch bei allen verbundenen Spielern in der
  Leseansicht; sie folgen dem Umblättern. Fehlen Leserechte, bietet Necronolib an, das Buch mit diesen Spielern zu teilen.
  „Nicht mehr anzeigen“ schließt die so geöffneten Reader wieder.
- **Teilen** (SL, Reader-Leiste oder Rechtsklick „Buch teilen …“): Checkbox-Liste aller Spieler (Standard: alle) →
  dauerhafter Zugriff über den Notizbuch-Tab. Geteilte Bücher öffnen sich bei diesen Spielern **nur in der Leseansicht**
  (auch über Links). Abwählen entzieht den Zugriff wieder.
- **Import/Export** (SL): Button „Buch importieren“ im Notizbuch-Tab
  - Necronolib-Buchdatei (`*.necronolib.json`) inkl. Cover, Seiten, SL-only-Seiten, CoC7-Verknüpfung
  - CoC7-Buch-Item (Foundry-Export-JSON) → Item + verknüpftes Buch
  - „Aus CoC7-Buch erstellen“ (Welt oder Kompendium) → verknüpftes Buch mit Beschreibung/Inhalt/SL-Notizen
  - Export per Rechtsklick „Als Necronolib-Buch exportieren“
  - Format + Workflow: `.claude/skills/necronolib-book-import/SKILL.md`, Prüfen mit `npm run validate -- datei.json`
- **Runenschrift „Da Rune“** für Covertitel (Schrift „Runen (Da Rune)“) — von Daniel Riantsoatahina,
  https://www.dafont.com/daniel-riantsoatahina.d11012, Nutzung mit Erlaubnis des Autors (privates, nicht-kommerzielles Projekt)

### Verbessert
- Atelier: größeres Standardfenster, zweispaltig, Inhalt scrollt, größere zentrierte Vorschau
- Reader: geschlossenes Buch ist anklickbar (auch Enter/Leertaste); Hinweistext eindeutig („Klicke auf das Buch …“)

72 Unit-Tests grün. Anzeigen/Teilen/Import sind nur per Tests + Preview geprüft, **nicht live in Foundry v14**.
