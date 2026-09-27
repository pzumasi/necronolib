## v0.2.1 — Hotfix Atelier

**Installation/Update in Foundry:** Manifest-URL
`https://github.com/pzumasi/necronolib/releases/latest/download/module.json`
(bestehende Installation: in Foundry „Aktualisieren“, danach Foundry neu starten)

### Fix
- „Buch-Cover gestalten“ öffnete sich nicht: `Failed to render template part "atelier": Missing helper: "selected"`.
  Den Handlebars-Helper `selected` gibt es in Foundry v14 nicht (mehr); die Auswahl wird jetzt im Code berechnet.
  Der Fehler steckte schon in v0.1.0.

### Tests
- Neuer Regressionstest: Templates dürfen nur Handlebars-Builtins + `localize` nutzen und werden damit gerendert
  (die Preview-Harnesses hatten `selected` selbst registriert und den Fehler so verdeckt). 53 Tests grün.

Alle Änderungen aus v0.2.0 siehe https://github.com/pzumasi/necronolib/releases/tag/v0.2.0
