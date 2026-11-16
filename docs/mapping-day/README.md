# Mapping day

- `guide.md` / `guide.fr.md`: mapping-day guide (EN / FR).
- `LICENCES.md`: accepted open licences.
- `export.ts`: validates contributions and builds an osmChange draft and a GeoJSON copy. It never uploads; a person submits to OpenStreetMap.
- `export.test.ts`: vitest tests. Run `npx vitest run docs/mapping-day`.

Unknown stays UNKNOWN and is not written as an OSM tag. Each record keeps source, licence and observation date.

## Offline packs and data-status sentences

`docs/offline-packs` builds an offline pack manifest from reviewed records, and `docs/data-status/explain.ts` writes one EN or FR sentence per record. UNKNOWN is stated, never inferred. Tests run with `npm run test:mapping-day` (the whole `docs/` tree).

## Planning a mapping day

`day-*.ts` (pure, no network, storage or clock) plan a day out: `day-grid` splits a small area into cells, `day-session` holds the person's plan, `day-coverage` counts saved records by cell, `day-route` suggests an order and estimates time only from a pace the person gives, `day-checklist` is the day-of list, `day-debrief` writes the summary, and `day-files` makes the cell table, shapes and debrief. A cell with no record says nothing about the place, and UNKNOWN stays UNKNOWN. The App shows this at `/places/mapping-day` and uploads nothing.
