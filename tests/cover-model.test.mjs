/**
 * Necronolib — Modell-Tests (node --test, kein Foundry nötig).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCover, defaultCover, coverVars, runesFor, titleFontSize,
  COVER_MATERIALS, WEAR_LEVELS, TITLE_EFFECTS, TITLE_FONTS, TITLE_POSITIONS,
  CLASP_STYLES, THICKNESSES, PALETTES, WEAR_OPACITY, THICKNESS_METRICS
} from '../src/cover/model.mjs';

test('defaultCover liefert vollständiges Schema', () => {
  const c = defaultCover();
  assert.equal(c.material, 'leather');
  assert.equal(c.palette, 'oxblood');
  assert.ok(COVER_MATERIALS.includes(c.material));
  assert.ok(WEAR_LEVELS.includes(c.wear));
  assert.ok(CLASP_STYLES.includes(c.clasps));
  assert.ok(THICKNESSES.includes(c.thickness));
  assert.ok(TITLE_FONTS.includes(c.title.font));
  assert.ok(TITLE_EFFECTS.includes(c.title.effect));
  assert.ok(TITLE_POSITIONS.includes(c.title.position));
  assert.equal(c.title.text, '');
});

test('normalizeCover repariert ungültige Werte defensiv', () => {
  const c = normalizeCover({ material: 'banana', palette: 'nope', wear: 'x', clasps: 3, thickness: {}, title: 'kein objekt' });
  assert.equal(c.material, 'leather');
  assert.equal(c.palette, 'oxblood'); // erste Palette des Fallback-Materials
  assert.equal(c.wear, 'medium');
  assert.equal(c.clasps, 'none');
  assert.equal(c.thickness, 'medium');
  assert.equal(c.title.text, '');
});

test('normalizeCover behält gültige Werte und trimmt Titel', () => {
  const c = normalizeCover({
    material: 'lacquer', palette: 'jade', wear: 'heavy', clasps: 'iron', thickness: 'tome',
    title: { text: '  Nameless Cults  ', font: 'runes', effect: 'emboss', position: 'top' }
  });
  assert.equal(c.material, 'lacquer');
  assert.equal(c.palette, 'jade');
  assert.equal(c.wear, 'heavy');
  assert.equal(c.clasps, 'iron');
  assert.equal(c.thickness, 'tome');
  assert.equal(c.title.text, 'Nameless Cults');
  assert.equal(c.title.font, 'runes');
  assert.equal(c.title.effect, 'emboss');
  assert.equal(c.title.position, 'top');
});

test('normalizeCover kapppt überlange Titel bei 120 Zeichen', () => {
  const c = normalizeCover({ title: { text: 'x'.repeat(300) } });
  assert.equal(c.title.text.length, 120);
});

test('Materialwechsel wirft ungültige Palette des alten Materials weg', () => {
  // jade ist eine lacquer-Palette — unter leather ungültig
  const c = normalizeCover({ material: 'leather', palette: 'jade' });
  assert.equal(c.material, 'leather');
  assert.ok(Object.keys(PALETTES.leather).includes(c.palette));
});

test('normalizeCover toleriert null/undefined und Non-Objects', () => {
  assert.deepEqual(normalizeCover(undefined), defaultCover());
  assert.deepEqual(normalizeCover(null), defaultCover());
  assert.deepEqual(normalizeCover('quatsch'), defaultCover());
});

test('coverVars setzt CSS-Vars aus Palette, Wear und Dicke', () => {
  const v = coverVars({ material: 'leather', palette: 'oxblood', wear: 'heavy', thickness: 'tome' });
  assert.equal(v['--nlc-base'], PALETTES.leather.oxblood.base);
  assert.equal(v['--nlc-base'], '#5a1f24');
  assert.equal(v['--nlc-dark'], '#3d1216');
  assert.equal(v['--nlc-light'], '#7d3539');
  assert.equal(v['--nl-wear-o'], String(WEAR_OPACITY.heavy));
  assert.equal(v['--nl-spine-w'], `${THICKNESS_METRICS.tome.spine}px`);
  assert.equal(v['--nl-pages-w'], `${THICKNESS_METRICS.tome.pages}px`);
});

test('coverVars normalisiert Raw-Input nebenbei', () => {
  const v = coverVars({ material: 'velvet' }); // ungültig → leather/oxblood-Defaults
  assert.equal(v['--nlc-base'], PALETTES.leather.oxblood.base);
  assert.equal(v['--nl-wear-o'], String(WEAR_OPACITY.medium));
});

test('Jede Material-Palette ist vollständig (base/dark/light)', () => {
  for (const [material, palettes] of Object.entries(PALETTES)) {
    for (const [name, pal] of Object.entries(palettes)) {
      assert.ok(pal.base && pal.dark && pal.light, `${material}.${name} unvollständig`);
      assert.match(pal.base, /^#[0-9a-f]{6}$/i);
      assert.match(pal.dark, /^#[0-9a-f]{6}$/i);
      assert.match(pal.light, /^#[0-9a-f]{6}$/i);
    }
  }
});

test('Alle Optionslisten sind eingefroren und nicht-leer', () => {
  for (const list of [COVER_MATERIALS, WEAR_LEVELS, TITLE_EFFECTS, TITLE_FONTS, TITLE_POSITIONS, CLASP_STYLES, THICKNESSES]) {
    assert.ok(Object.isFrozen(list));
    assert.ok(list.length > 0);
  }
  assert.ok(Object.isFrozen(PALETTES));
});

test('runesFor liefert deterministische Runen-Sequenz', () => {
  const a = runesFor('Cultes des Goules');
  const b = runesFor('Cultes des Goules');
  assert.equal(a, b);
  assert.notEqual(a, runesFor('De Vermis Mysteriis'));
  assert.equal(a.length, 9);
});

test('runesFor nutzt nur Runen-Glyphen und toleriert leeren Seed', () => {
  const valid = new Set('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ');
  for (const ch of runesFor('x')) assert.ok(valid.has(ch), `keine Rune: ${ch}`);
  assert.equal(runesFor('').length, 9);
  assert.equal(runesFor(null).length, 9);
  assert.equal(runesFor('seed', 5).length, 5);
});

test('titleFontSize skaliert nach längstem Wort', () => {
  assert.equal(titleFontSize(''), '1.35rem');
  assert.equal(titleFontSize('Cultes'), '1.35rem');
  assert.equal(titleFontSize('Cultes des Goules'), '1.35rem'); // längstes Wort 6
  assert.equal(titleFontSize('Reisetagebuch'), '0.95rem'); // 13
  assert.equal(titleFontSize('Familienchronik'), '0.95rem'); // 15
  assert.equal(titleFontSize('Unaussprechliche Kulte'), '0.82rem'); // 16
  assert.equal(titleFontSize('Donaudampfschifffahrtsgesellschaft'), '0.82rem'); // 34
});
