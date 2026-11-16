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

- `places`, `placeRender`: match a place against the features a person chose
  (`matchPlace`, `rankPlaces`), one-sentence verdicts that never call a place
  "accessible" overall, and age notes on sources (`claimFreshness`). Unknown is never counted as met.
- `csvImport`: `importClaims` turns an open-data CSV into places; it refuses files
  without a valid source, open licence and date, and unmapped cells stay unknown.
- `offlineCache`: cache manifest, cache-update plan, request strategy (same-origin
  only, so tile servers are never cached) and the offline banner text. `mountGlossary`
  takes `isOnline` and `refreshConnection()`.
- `exportGlossary`: text, Markdown or JSON copy for printing or saving.
- `theme`: `fullGlossaryCss()` = base + place + preference styles (contrast, forced colours, reduced motion, print).
- `auditCss`, `auditHtml`, `auditTerms`, `audit`: the CI gate. `audit.test.ts` runs
  `runAudit()` over the shipped terms, styles, markup and UI strings and fails on any
  error. `auditExitCode(report, console.log)` is ready for a CI script.
  The glossary licence is reported as a warning until it is set to an SPDX id.

Inline term links (`.gl-term`) rely on the WCAG 2.2 inline-link exception to the
target-size rule; every standalone control is at least 44px.

Run: `vitest run packages/glossary`.
