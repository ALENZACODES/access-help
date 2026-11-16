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

/**
 * Copy must never say or suggest that the App runs a scanner, because it does
 * not: a highlight interval is only a saved preference. These patterns catch
 * wording that starts, runs, turns on or promises scanning. Negated forms such
 * as "does not run a scanner" are fine.
 */
export const SCANNER_CLAIMS: readonly RegExp[] = [
  // "starts scanning", "runs a scanner", "turns on the scanner", "enables automatic scanning".
  /(?<!\bnot )(?<!\bnever )(?<!n['’]t )(?<!\bno )\b(?:starts?|begins?|runs?|running|launch(?:es)?|turns? on|enables?|activates?)\s+(?:a |an |the |its |your )?(?:auto(?:matic(?:ally)?)?[- ])?(?:scanner|scanning|scan)\b/i,
  // "the App scans", "automatically highlights", "steps through the items for you".
  /\b(?:app|page|site|help centre)\s+(?:will\s+)?(?:automatically\s+)?(?:scans|highlights)\b/i,
  /\bautomatically\s+(?:scans|highlights|moves through|steps through)\b/i,
  // "Scanning stays off until you start it" says a scanner exists.
  /\bscanning\b[^.]{0,40}\buntil you (?:start|turn|switch)/i,
  // French.
  /(?<!pas )(?<!jamais )\b(?:lance|lancent|démarre|démarrent|exécute|exécutent|active|activent)\s+(?:automatiquement\s+)?(?:le|un|son|votre)\s+balayage/iu,
  /\bbalaie\s+automatiquement/iu,
  /\bbalayage\b[^.]{0,40}\btant que vous ne le (?:lancez|démarrez|activez)/iu,
];

/** Returns the first wording that claims a scanner runs, or undefined. */
export function findScannerClaim(text: string): string | undefined {
  for (const re of SCANNER_CLAIMS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return undefined;
}
