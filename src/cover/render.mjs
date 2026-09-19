/**
 * Necronolib — Cover-Rendering (DOM, Foundry-agnostisch).
 * Bringt ein Cover auf ein Preview-Markup (siehe templates/partials/book.hbs).
 */
import { normalizeCover, coverVars } from './model.mjs';

/**
 * Wendet ein Cover auf ein gerendertes Buch-Markup an, ohne Re-Render:
 * setzt CSS-Vars am Book-Element und data-Attributes für Materialstil-Selektoren.
 * @param {Element|HTMLElement} root Element, das [data-nl-book] enthält
 * @param {object} cover Cover-Objekt (raw reicht; wird normalisiert)
 * @returns {boolean} true, wenn ein Buch-Element gefunden und aktualisiert wurde
 */
export function applyCover(root, cover) {
  const book = root?.querySelector?.('[data-nl-book]');
  if (!book) return false;
  const c = normalizeCover(cover);
  for (const [key, value] of Object.entries(coverVars(c))) book.style.setProperty(key, value);
  book.dataset.material = c.material;
  book.dataset.wear = c.wear;
  book.dataset.clasp = c.clasps;
  book.dataset.thickness = c.thickness;
  const title = book.querySelector('[data-nl-title]');
  if (title) {
    title.textContent = c.title.text;
    title.dataset.font = c.title.font;
    title.dataset.effect = c.title.effect;
    title.dataset.pos = c.title.position;
  }
  return true;
}
