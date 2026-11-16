# Places on this device

The App ships with no places. The Places screens (`/places`, `/places/status`, `/places/contribute` in `apps/centre`) read a pack file that a person loads, keep it on that device, and work offline once it is saved. Nothing is uploaded.

## What a pack file is

JSON written by `serializePack` in `docs/offline-packs/pack.ts`: a manifest (`packId`, `generatedOn`, `recordCount`) and a GeoJSON `FeatureCollection`. Each feature carries `id`, `name`, `wheelchair`, `source`, `licence` and `observedOn`. A person can write one from their own observations on `/places/contribute`.

## Rules the code enforces

| Rule | Where |
| --- | --- |
| The manifest is rebuilt from the records. A declared count that disagrees is refused. | `apps/centre/src/places/pack.ts` |
| A status other than `yes`, `limited`, `no` or `UNKNOWN` is shown as UNKNOWN, with a note. Nothing is promoted to a better status. | `pack.ts` |
| A place without a source, an open licence (CC0-1.0 or ODbL-1.0) or a real observation date is left out, with a note. | `pack.ts`, `docs/mapping-day/export.ts` |
| A step-free filter never counts UNKNOWN as a match. UNKNOWN places are listed apart. | `filter.ts` |
| Stored data is re-checked on every read. | `store.ts` |
| The observation form defaults to UNKNOWN and needs the person's own confirmation. | `contribute.ts` |
| The App writes files. A person submits them to OpenStreetMap. | `ContributeView.tsx` |

## What it does not claim

It does not say a place has been checked on site, is open, is safe or suits a person. It shows no live status. It gives no medical advice and no decision about benefits or eligibility. Distance is a straight line from a location the person shares once, on that device only. No map tiles are loaded.

## Checks

- `apps/centre/src/places/*.test.ts`: pack reading, filters, storage, form, strings (EN/FR parity and French punctuation).
- `qa/src/places-guards.test.ts`: no network call, no bundled data, no overclaim, 44 px targets, routes wired into the shell.
- `qa/tests/places.spec.ts`: Playwright with axe, keyboard, offline, French, downloads.
- The three screens are part of the Day 17 audit in `qa/src/audit/model.ts`.
- `npm run test:docs` runs the docs tooling tests, and `npm run typecheck` checks `docs/**/*.ts`.

## Lieux sur cet appareil (résumé)

L’application ne contient aucun lieu. Les écrans Lieux lisent un fichier de paquet chargé par la personne, le gardent sur son appareil et fonctionnent hors ligne une fois le paquet enregistré. Rien n’est envoyé. Un statut inconnu reste UNKNOWN. Les fichiers créés sont soumis à OpenStreetMap par la personne elle-même.
