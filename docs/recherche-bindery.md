# Recherche: The Bindery & CoC7-Buchdatenmodell

Stand: 2026-09-19 · Für Projektentscheidungen

## 1. The Bindery (Origin Studios / Patreon "Reslinfvtt")

### Fakten aus Foundry-Package-Seite + Manifest (v0.1.1)

- **Zweck**: Module for creating custom books — "adjust almost every visible detail"
- **Features laut Package-Page**:
  - Proportionen, Dicke, Buchrücken-Stile, Klappen/Schließen, Eckbeschläge, Metallteile, Ketten
  - Cover-Materialien: Leder, Lack, Pergament (vellum), Stoff — Farben, Texturen, Abnutzung (wear), Zierbordüren
  - Titel: Font, Größe, Position — Prägung bis Goldlettering; eigenes Cover-Bild uploadbar
  - Frei platzierte Embleme (Wappen, Symbole, Gems): verschieben, skalieren, rotieren, überlappen
  - Seiten-Editor: Fonts, Absatzformatierung, Bilder, Tabellen, Links, Trennlinien; Text fließt um Illustrationen
- **Versionsfenster**: Foundry 13–14 (verified 14), v0.1.0 → 0.1.1 innerhalb ~1 Woche (Early Access)
- **Patreon-Tiers**: "The architect" = Early Access; "Originator" ~3 Wochen später → zwei gestaffelte Betatest-Gruppen
- **Monetarisierung**: Kauf direkt beim Publisher (Patreon), NICHT im Foundry-Marketplace

### Architektur-Hinweise aus dem öffentlichen Manifest

```json
{
  "id": "bindery",
  "version": "0.1.1",
  "compatibility": { "minimum": "13", "verified": "14", "maximum": "14" },
  "esmodules": ["scripts/main.mjs"],
  "styles": ["styles/bindery.css", "styles/ephemera-reader.css"],
  "socket": true,
  "protected": true
}
```

- `socket: true` → **geteiltes Lesen**: SL öffnet Buch, Spieler folgen (Page-Turn-Sync über Sockets)
- **Zwei CSS-Dateien** → saubere Trennung Editor (bindery.css) vs. Reader (ephemera-reader.css) — bestätigt zwei Apps
- `protected: true` → Code verschleiert (kein Abgucken; Name "ephemera" = Produktfamilie)
- EN + CN (简体中文) Lokalisierung ab v0.1
- Kein `download`/`manifest` im öffentlichen Manifest → Auslieferung läuft außerhalb von foundryvtt.com (patreon-gated Download), Update-Check vermutlich über gesonderten Manifest-Endpoint für Käufer

### Open-Source-Landschaft (Stand 09/2026)

- **Custom Journal** (Sanyella): Journal-Theming, kein Buch-Objekt, kein Reader — v14-Stand unsicher
- **Monk's Enhanced Journal**: mächtig, aber kein visuelles Buch; v14 nur inoffizieller Fork (DNDMLunga/monks-enhanced-journal-v14)
- **Kein** freies Modul kombiniert: prozedurale Covers + Buch-Reader + Umblätter-Erlebnis + geteiltes Lesen. Nische ist real offen.

## 2. CoC7 `book`-Item (System 8.15, develop-Stand)

Aus `coc7/models/item/book-system.js` (defineSchema) + `docs/en/item_book.md`:

| Feld | Typ | Bedeutung |
|---|---|---|
| `author`, `date`, `language` | String | Metadaten; `language` = Skill-Name für Leseprobe |
| `content` | HTMLField | Buchinhalt als HTML (!) |
| `description.value` / `.keeper` | HTML | Spieler-/SL-Text |
| `difficultyLevel` | String | regular/hard/extreme/critical/unreadable → Sprach-Probe bei Initial Reading |
| `gains.cthulhuMythos.initial/final` | Number | CMI/CMF-Gewinn |
| `gains.occult`, `gains.others[]` | | Occult-/Skill-Gewinne |
| `mythosRating` | Number | Schwelle für Reference-Check (1D4) |
| `sanityLoss` | String | z. B. "2D6" |
| `itemDocuments` / `itemKeys` | Array | Verknüpfte Spells/Skills |
| `study.necessary` + `units` | Number/String | Studienzeit (Wochen etc.); Progress am Actor |
| `type.mythos/occult/other` | Boolean | Klassifikation |

**Mechaniken im System vorhanden**: `attemptInitialReading()` (Sprach-Probe gegen difficultyLevel), `attemptReference()` (1D4 vs. mythosRating), Full Study prüft Actor-CthulhuMythos vs. Mythos-Rating → CMI oder CMF (Keeper's Rulebook S. 174). Study-Progress/`fullStudies`/`initialReading` liegen am **Actor** (Flags), nicht am Item.

→ **Konsequenz für Necronolib**: CoC7 liefert die Mechanik-Datenstruktur komplett. Unser Modul muss sie **inszenieren** (Buch-Erlebnis), nicht neu erfinden.perfekte Nahtstelle: `book.content` (HTML) ↔ unsere Seiten; `description.keeper` ↔ SL-only-Seiten.

## 3. Ableitung für Necronolib

1. Kern systemagnostisch halten (Foundry-Journal-Dokumente als Speicher), CoC7-Integration als optionale Schicht (relationship `optional: true`)
2. Zwei Apps wie Bindery: **Atelier** (Editor) + **Reader** (geteilt via Socket)
3. Cover prozedural als CSS/SVG-Layer (Material, Beschläge, Embleme) + optionaler Bild-Upload — Bindery-Parität ohne Asset-Pack
4. CoC7-Brücke: Verknüpfung Journal ↔ `book`-Item via Flags/UUID; Reader zeigt Mechanik-Buttons (Initial Reading, Sanity) nur bei verknüpftem Item
5. deployment: privates Repo → manueller Zip-Install (Manifest-404-Problem bei privaten Repos, s. foundry-module-builder-Skill)

## Quellen

- https://foundryvtt.com/packages/bindery (Package-Page, Feature-Liste)
- https://r2.foundryvtt.com/packages-public/bindery/module-0.1.1.json (Manifest)
- https://www.patreon.com/Reslinfvtt/posts/early-access-own-169553617 (Early-Access-Post)
- https://github.com/Miskatonic-Investigative-Society/CoC7-FoundryVTT — `coc7/models/item/book-system.js`, `docs/en/item_book.md`
- https://github.com/DNDMLunga/monks-enhanced-journal-v14 (inoffizieller v14-Fork MEJ)
