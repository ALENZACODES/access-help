# Mapping day

- `guide.md` / `guide.fr.md`: mapping-day guide (EN / FR).
- `LICENCES.md`: accepted open licences.
- `export.ts`: validates contributions and builds an osmChange draft and a GeoJSON copy. It never uploads; a person submits to OpenStreetMap.
- `export.test.ts`: vitest tests. Run `npx vitest run docs/mapping-day`.

Unknown stays UNKNOWN and is not written as an OSM tag. Each record keeps source, licence and observation date.

## Offline packs and data-status sentences

`docs/offline-packs` builds an offline pack manifest from reviewed records, and `docs/data-status/explain.ts` writes one EN or FR sentence per record. UNKNOWN is stated, never inferred. Tests run with `npm run test:mapping-day` (the whole `docs/` tree).
