/**
 * CI- and test-only forbidden-term guard.
 * Do not import this module from UI code or from any package entry the user bundle can reach.
 * Terms are stored as character codes so this file never contains the decoded literals.
 */

function fromCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const ENCODED: readonly { id: string; codes: readonly number[] }[] = [
  { id: "short", codes: [83, 67, 73, 79] },
  { id: "en-long", codes: [83, 112, 105, 110, 97, 108, 32, 67, 111, 114, 100, 32, 73, 110, 106, 117, 114, 121, 32, 79, 110, 116, 97, 114, 105, 111] },
  { id: "fr-long", codes: [76, 233, 115, 105, 111, 110, 115, 32, 77, 233, 100, 117, 108, 108, 97, 105, 114, 101, 115, 32, 79, 110, 116, 97, 114, 105, 111] },
];

export interface ForbiddenTerm {
  id: string;
  term: string;
}

export function decodedForbiddenTerms(): ForbiddenTerm[] {
  return ENCODED.map(({ id, codes }) => ({ id, term: fromCodes(codes) }));
}

function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(escaped, "i");
}

/** Case-insensitive match of the short name and the long English and French organisation names. */
export function findForbiddenTerms(text: string): string[] {
  const haystack = text.normalize("NFC");
  return decodedForbiddenTerms()
    .filter((item) => termPattern(item.term).test(haystack))
    .map((item) => item.id);
}

export function containsForbiddenTerm(text: string): boolean {
  return findForbiddenTerms(text).length > 0;
}
