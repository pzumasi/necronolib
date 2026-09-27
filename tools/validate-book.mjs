/**
 * Necronolib — Buchdatei prüfen (npm run validate -- <datei.necronolib.json> …).
 * Gibt Fehler (Import würde abgelehnt) und Hinweise aus; Exit-Code 1 bei Fehlern.
 */
import { readFileSync } from 'node:fs';
import { validateBook, detectImportKind } from '../src/io/book-format.mjs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Aufruf: node tools/validate-book.mjs <datei.necronolib.json> [...]');
  process.exit(2);
}
let failed = 0;
for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`✗ ${file}: kein gültiges JSON (${error.message})`);
    failed++;
    continue;
  }
  const kind = detectImportKind(data);
  if (kind === 'coc7-item') {
    console.log(`✓ ${file}: CoC7-Buch-Item „${data.name}“ (Import legt Item + verknüpftes Buch an)`);
    continue;
  }
  const res = validateBook(data);
  for (const w of res.warnings) console.warn(`  ⚠ ${w}`);
  if (res.ok) {
    console.log(`✓ ${file}: „${res.book.name}“, ${res.book.pages.length} Seiten${res.book.coc7 ? ', CoC7-Verknüpfung' : ''}`);
  } else {
    for (const e of res.errors) console.error(`  ✗ ${e}`);
    console.error(`✗ ${file}: ungültig`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
