# @access/glossary

Plain-language accessibility terms in English and French, used by help pages.

- `lookupTerm(id, lang)`: one term. A missing or unrecognised id returns the
  Unknown entry (`known: false`). We never guess.
- `listTerms(lang)`: all terms, sorted for display.
- `searchTerms(query, lang)`: accent- and apostrophe-insensitive search.
- `termCountLabel(count, lang)`: `1 term` / `N terms` and `1 terme` / `N termes`.
- `TERMS`, `UNKNOWN_TERM`, `GLOSSARY_META`: the data and its source, licence and date.

Plain-language lookup lives in `src/glossary.ts` and `src/plainTerms.ts`, and is re-exported from `src/index.ts` alongside the existing catalog (`src/terms.ts`). Descriptions say what a feature is;
they describe what a place marks, not who qualifies or how to get a permit. French strings use ’ and
non-breaking spaces before `:`, `;`, `!` and `?`; the tests check this.

Run: `vitest run packages/glossary`.
