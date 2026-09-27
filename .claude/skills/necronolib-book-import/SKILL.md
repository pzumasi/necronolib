---
name: necronolib-book-import
description: Necronolib-Bücher als Importdatei (*.necronolib.json) erstellen, prüfen und in Foundry importieren — inklusive Cover, Seiten (HTML/Markdown/Bild), SL-only-Seiten und Verknüpfung mit CoC7-Buch-Items; außerdem CoC7-Buch-Items importieren bzw. daraus Bücher erzeugen. Immer nutzen, wenn ein Buch/Tome/Handout-Buch für Necronolib aus Text, Vault-Notizen oder Quellen erstellt, konvertiert, exportiert, validiert oder importiert werden soll, oder wenn das Import-/Exportformat, der Import-Dialog oder die CoC7-Verknüpfung erklärt oder repariert werden muss.
---

# Necronolib — Buch-Import/-Export

Necronolib speichert Bücher als Foundry-`JournalEntry` (Cover in `flags.necronolib.book`,
Seiten als `JournalEntryPage`). Für den Austausch gibt es **ein** JSON-Format:
`necronolib-book`, Version 1. Code: `src/io/book-format.mjs` (Validierung, pure),
`scripts/io.mjs` (Foundry). Beispiel: `docs/examples/cultes-des-goules.necronolib.json`.

## Setup / Ablauf in Foundry (GM)

1. **Import**: Notizbuch-Tab → Button **„Buch importieren“** (Kopf des Verzeichnisses)
   - *Aus Datei*: `*.necronolib.json` **oder** ein aus Foundry exportiertes CoC7-Buch-Item (JSON mit `"type": "book"`)
   - *Aus CoC7-Buch erstellen* (nur mit CoC7): Buch aus Welt oder Kompendium wählen → Journal mit
     Seiten „Beschreibung“, „Inhalt“ (`system.content`), „SL-Notizen“ (SL-only) wird angelegt und verknüpft.
     Kompendium-Bücher werden dafür zuerst in die Welt importiert.
2. **Export**: Rechtsklick auf ein Journal → **„Als Necronolib-Buch exportieren“** → Download
   `<name>.necronolib.json` (inkl. CoC7-Item-Daten, damit die Verknüpfung in einer anderen Welt neu entsteht).
3. **Makro/API**: `game.necronolib.importBookData(obj)`, `game.necronolib.exportBook(journal)`,
   `game.necronolib.openImportDialog()`, `game.necronolib.createBookFromCoc7Item(item)`.

## Datei prüfen (vor dem Import, lokal)

```bash
npm run validate -- pfad/zur/datei.necronolib.json
```
Exit-Code 0 = importierbar. Fehler (✗) blockieren den Import, Hinweise (⚠) nicht.
Beim Erzeugen von Dateien **immer** validieren, bevor sie dem User gegeben werden.

## Format `necronolib-book` v1

```json
{
  "format": "necronolib-book",
  "version": 1,
  "name": "Cultes des Goules",
  "cover": { "material": "leather", "palette": "black", "wear": "heavy", "clasps": "iron",
             "thickness": "tome",
             "title": { "text": "Cultes des Goules", "font": "runes", "effect": "gilt", "position": "center" } },
  "coc7": { "uuid": "Item.abc123", "name": "Cultes des Goules", "item": { "name": "…", "type": "book", "system": {} } },
  "pages": [
    { "name": "Titelblatt", "type": "text", "html": "<h1>…</h1>" },
    { "name": "Vorrede", "type": "text", "markdown": "**Warnung** …", "showTitle": true, "titleLevel": 2 },
    { "name": "Kapitel VII", "type": "text", "html": "<p>…</p>", "keeperOnly": true },
    { "name": "Holzschnitt", "type": "image", "src": "worlds/meine-welt/bilder/ghul.webp", "caption": "…" }
  ]
}
```

| Feld | Pflicht | Regeln |
|---|---|---|
| `format` / `version` | ja | exakt `"necronolib-book"` / `1` |
| `name` | ja | Journal-Name, max. 200 Zeichen; zugleich Default-Covertitel |
| `cover` | nein | fehlende/ungültige Werte → Defaults (siehe unten) |
| `coc7` | nein | Verknüpfung; Auflösung: `uuid` → Welt-Buch mit gleichem `name` → `item` neu anlegen |
| `pages[]` | ja (darf leer sein) | max. 500; Reihenfolge = Lesefolge |
| `pages[].type` | nein | `text` (Default) oder `image` — andere Typen werden abgelehnt |
| `pages[].html` / `.markdown` | bei text | eins von beiden; `html` gewinnt; max. 500 000 Zeichen |
| `pages[].src` / `.caption` | bei image | relativer Foundry-Pfad, `http(s)://` oder `data:image/…;base64` |
| `pages[].keeperOnly` | nein | `true` = nur SL sieht die Seite im Reader |
| `pages[].showTitle` / `.titleLevel` | nein | Seitentitel anzeigen, Ebene 1–3 |

**Cover-Werte** (`src/cover/model.mjs`):
- `material`: `leather` · `lacquer` · `vellum` · `cloth`
- `palette` je Material: leather `oxblood|black|tan|forest` · cloth `navy|wine|olive|charcoal` ·
  lacquer `crimson|black|indigo|jade` · vellum `cream|honey|ivory|slate`
- `wear`: `none|light|medium|heavy` · `clasps`: `none|brass|iron` · `thickness`: `slim|medium|tome`
- `title.font`: `serif|sans|runes` (runes = Schrift „Da Rune“) · `title.effect`: `gilt|emboss|ink` ·
  `title.position`: `top|center|bottom` · `title.text`: max. 120 Zeichen, leer = prozedurale Runen

**Inhalt in Seiten:** Foundry-Journal-HTML ist erlaubt, inkl. `@UUID[...]`-Links und
`<section class="secret">…</section>` (nur Besitzer/SL sehen Secrets). Beim Import werden entfernt:
`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, Event-Handler (`on…=`) und `javascript:`-URLs.
Bilder müssen in Foundry erreichbar sein (Pfad relativ zum Foundry-Data-Ordner, z. B. `worlds/<welt>/…`).

## CoC7-Buch-Item (für `coc7.item` oder als eigene Importdatei)

Foundry-Item-Export (`Rechtsklick → Daten exportieren`) mit `"type": "book"`. Relevante `system`-Felder
(CoC7 8.15, `coc7/models/item/book-system.js`, siehe `docs/recherche-bindery.md` §2):
`author`, `date`, `language`, `content` (HTML), `description.value` / `.keeper` (HTML),
`difficultyLevel` (`regular|hard|extreme|critical|unreadable`), `sanityLoss` (z. B. `"2D6"`),
`mythosRating`, `gains.cthulhuMythos.initial` / `.final`, `study.necessary`, `type.mythos` / `.occult`.
Mechanik (Erstlesung, Nachschlagen, Stabilitätsverlust) bleibt im CoC7-System; Necronolib zeigt nur an
und delegiert. **Aktionsbuttons im Reader erscheinen nur, wenn das verknüpfte Item einem Actor gehört.**
Felder für andere CoC7-Versionen vor Nutzung an einem echten Export prüfen.

## Vorgehen beim Erstellen einer Buchdatei (z. B. aus Vault-Notizen)

1. Seiten schneiden: eine Seite ≈ eine Doppelseiten-Hälfte (ca. 150–300 Wörter), Überschriften als
   `showTitle`/`titleLevel` statt im Text doppeln.
2. SL-Wissen (Wahrheiten, Werte, Hinweise) in eigene `keeperOnly`-Seiten oder `secret`-Sections.
3. Vorlesetexte/Handout-Prosa unverändert übernehmen (bei CoC-Vault-Texten gilt der Stil-Skill `coc-lovecraft-stil`).
4. Cover passend wählen (Mythos-Tome: `leather`/`black`/`heavy`/`tome`, Tagebuch: `cloth`/`slim`).
5. `npm run validate -- datei.json` → erst bei ✓ weitergeben.

## Fehlerbilder

| Meldung | Ursache / Lösung |
|---|---|
| „Import abgelehnt: …“ | Validierungsfehler — Details in der Konsole (F12); vorher `npm run validate` |
| „CoC7-Buch … nicht gefunden“ | uuid/name passen nicht in dieser Welt und kein `coc7.item` → Buch ohne Link importiert; im Atelier verknüpfen |
| „Dafür muss das CoC7-System aktiv sein“ | CoC7-Item-Import in einer Nicht-CoC7-Welt |
| Bild fehlt im Reader | `src`-Pfad existiert in Foundry nicht (Datei zuerst hochladen) |
