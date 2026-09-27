/**
 * Necronolib — Render-Tests mit minimalem DOM-Stub.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCover } from '../src/cover/render.mjs';

/** Winziger DOM-Stub: nur was applyCover braucht. */
function makeBookElement() {
  const title = {
    textContent: '',
    dataset: {},
    style: { setProperty() {} }
  };
  const book = {
    dataset: {},
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; }
    },
    querySelector(sel) { return sel === '[data-nl-title]' ? title : null; }
  };
  return { book, title };
}

test('applyCover setzt CSS-Vars und data-Attribute am Buch-Element', () => {
  const { book, title } = makeBookElement();
  const root = { querySelector: (sel) => (sel === '[data-nl-book]' ? book : null) };
  const ok = applyCover(root, { material: 'lacquer', palette: 'jade', wear: 'heavy', thickness: 'tome', clasps: 'iron', title: { text: 'Cultes', font: 'runes', effect: 'gilt', position: 'top' } });
  assert.equal(ok, true);
  assert.equal(book.dataset.material, 'lacquer');
  assert.equal(book.dataset.wear, 'heavy');
  assert.equal(book.dataset.clasp, 'iron');
  assert.equal(book.dataset.thickness, 'tome');
  assert.equal(book.style.props['--nlc-base'], '#1f5545'); // lacquer.jade
  assert.equal(book.style.props['--nl-spine-w'], '40px'); // tome
  assert.equal(title.textContent, 'Cultes');
  assert.equal(title.dataset.font, 'runes');
  assert.equal(title.dataset.effect, 'gilt');
  assert.equal(title.dataset.pos, 'top');
  assert.equal(title.className, "nl-title nl-font-runes nl-effect-gilt");
  assert.equal(title.hidden, false);
});

test('applyCover mit Raw-Cover fällt auf Defaults zurück (normalisiert)', () => {
  const { book, title } = makeBookElement();
  const root = { querySelector: () => book };
  applyCover(root, { material: 'fluff' });
  assert.equal(book.dataset.material, 'leather'); // normalisiert, nicht raw
  assert.equal(book.style.props['--nlc-base'], '#5a1f24'); // leather/oxblood aus Normalisierung
  assert.equal(title.textContent, '');
});

test('applyCover gibt false zurück, wenn kein Buch-Element existiert', () => {
  assert.equal(applyCover({ querySelector: () => null }, {}), false);
  assert.equal(applyCover(null, {}), false);
});

test('applyCover schaltet Titel ↔ Runen und setzt Positionsklasse am Wrapper', () => {
  const title = { textContent: '', dataset: {}, className: '', hidden: true };
  const runes = { hidden: false };
  const wrap = { className: '' };
  const book = {
    dataset: {},
    style: { setProperty() {} },
    querySelector: (sel) => ({ '[data-nl-title]': title, '[data-nl-runes]': runes, '[data-nl-title-wrap]': wrap }[sel] ?? null)
  };
  const root = { querySelector: () => book };
  applyCover(root, { title: { text: 'Necronomicon', position: 'bottom', effect: 'ink', font: 'sans' } });
  assert.equal(title.hidden, false);
  assert.equal(runes.hidden, true);
  assert.equal(wrap.className, 'nl-title-wrap nl-pos-bottom');
  assert.equal(title.className, 'nl-title nl-font-sans nl-effect-ink');
  applyCover(root, { title: { text: '   ' } });
  assert.equal(title.hidden, true);
  assert.equal(runes.hidden, false);
});
