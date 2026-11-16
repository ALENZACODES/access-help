# help-fr-polish

Small checker and fixer for French typography in plain-text help content.

Rules: ’ apostrophe, U+00A0 before `:`, U+202F before `;` `!` `?` and inside « ».
Straight `"…"` pairs become « … ». Times, URLs, query strings and `&amp;`-style
entities are left alone. An unpaired straight quote is reported, never guessed.

```ts
import { checkFrTypography, fixFrTypography } from './src/index.js';
checkFrTypography("Bonjour l'App !"); // issues with EN + FR messages
fixFrTypography("Bonjour l'App !");   // "Bonjour l’App\u202F!"
```

Input is plain text, not HTML. No data is bundled, so there is no source or
licence to record. Run `npm test` and `npm run typecheck` in this folder.
