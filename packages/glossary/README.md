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


## Modules

- `glossary`, `plainTerms`: the data and `lookupTerm` / `listTerms` / `searchTerms`.
- `status`: `FeatureClaim` with `present` / `absent` / `unknown`. A claim without a
  valid source, open licence and date counts as unknown. Two valid sources that
  disagree give unknown with `conflict`. Missing terms are unknown, never inferred.
- `provenance`: source / licence / date checks (open SPDX licences only, real dates).
- `offlineIndex`: serialisable search index with a checksum; `loadOrBuildIndex`
  reads a valid, current cached copy (for example `localStorage`) or rebuilds it.
- `render`: `renderShell`, `renderResults`, `GLOSSARY_CSS` and `mountGlossary(root, { lang, claims?, store? })`
  (search box, polite live count, 44px input, language switch).
- `annotate`: links glossary terms inside help text (`annotateToHtml`).
- `locale`: `pickLang` from Accept-Language / `navigator.languages`.
- `frTypography`, `copyRules`, `plainLanguage`: `fixFrench` / `frenchIssues`,
  `lintCopy` (no verified / real-time / partnership / conformance / AI / medical /
  eligibility wording) and sentence-length checks. `rules.test.ts` runs all three
  over everything the package ships.

Inline term links (`.gl-term`) rely on the WCAG 2.2 inline-link exception to the
target-size rule; every standalone control is at least 44px.

Run: `vitest run packages/glossary`.
