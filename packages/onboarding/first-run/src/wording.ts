// guard:allow-terms (this file lists the words user copy must not use)

/**
 * Wording that must not appear in user-facing copy: it would claim more than
 * the App can back up. Used by the guard, the DOM audit and the copy audit.
 */
export const BANNED_WORDING =
  /\b(real-?time|certified|conformant|guarantee[ds]?|guaranteeing|partnership|partnered)\b|\bverif(?:y|ies|ied|ying|ication|iable)\b|temps r[ée]el|(?<!\p{L})v[ée]rif\p{L}*|garanti[es]?(?!\p{L})|conforme(?!\p{L})|partenariat/iu;

/** Returns the first banned word found, or undefined. */
export function findBanned(text: string): string | undefined {
  return BANNED_WORDING.exec(text)?.[0];
}
