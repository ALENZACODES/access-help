import { GLOSSARY_CSS } from './render';
import { FINDER_CSS } from './finderRender';
import { PLACE_CSS } from './placeRender';

/** Preference-driven styling: more contrast, forced colours, reduced motion, print. */
export const THEME_CSS = `@media (prefers-contrast: more) { .gl-item, .gl-input, .gl-place, .gl-claim, .gl-btn, .gl-fieldset { border-width: 3px; } }
@media (forced-colors: active) { .gl-item, .gl-input, .gl-place, .gl-btn, .gl-fieldset, .gl-compare th, .gl-compare td { border-color: CanvasText; } .gl-input:focus-visible { outline-color: Highlight; } }
@media (prefers-reduced-motion: no-preference) { .gl-item { transition: outline-offset 0.1s ease; } }
@media print { .gl-input { display: none; } .gl-item, .gl-place { break-inside: avoid; } }
`;

/** Everything a page needs to style the glossary, place cards and the place finder. */
export function fullGlossaryCss(): string {
  return `${GLOSSARY_CSS}${PLACE_CSS}${FINDER_CSS}${THEME_CSS}`;
}
