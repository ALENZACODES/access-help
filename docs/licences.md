# Licences for dependencies used here

Checked against the 13 November 2026 scout log and the packages this repository actually installs. This is not a full legal opinion. Attribution notices ship with the installed packages in `node_modules` and must stay with any redistribution.

| Package | SPDX | Role | Note |
| --- | --- | --- | --- |
| React, React DOM | MIT | Interface | |
| Vite, @vitejs/plugin-react | MIT | Build | |
| vite-plugin-pwa | MIT | Service worker | Pulls Workbox (MIT) for the offline shell. Cache only this App's own help pack. |
| i18next, react-i18next | MIT | Shell strings | Articles are records, not i18next messages. |
| idb | ISC | IndexedDB | Help pack only. No health record. |
| Ajv, ajv-formats | MIT | JSON Schema 2020-12 | |
| Vitest | MIT | Unit tests | |
| Playwright | Apache-2.0 | Browser tests | No Microsoft endorsement. |
| axe-core, @axe-core/playwright | MPL-2.0 | Accessibility checks | File-level copyleft. This repository does not modify axe-core source. Do not relicense those files. |
| TypeScript | Apache-2.0 | Types | |

Not used, and not to be added: pa11y (LGPL-3.0), OpenRouteService (GPL-3.0), OpenTripPlanner (LGPL-3.0-or-later), Nominatim software (GPL-3.0).

OpenStreetMap data is not vendored here. If a later map uses it, ODbL attribution and share-alike apply, and that layer stays separate. This help package does not mix map data.

No secrets, API keys, or personal data belong in this repository.
