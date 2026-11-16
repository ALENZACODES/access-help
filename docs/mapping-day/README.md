# Mapping day

- `guide.md` / `guide.fr.md`: mapping-day guide (EN / FR).
- `LICENCES.md`: accepted open licences.
- `export.ts`: validates contributions and builds an osmChange draft and a GeoJSON copy. It never uploads; a person submits to OpenStreetMap.
- `export.test.ts`: vitest tests. Run `npx vitest run docs/mapping-day`.

Unknown stays UNKNOWN and is not written as an OSM tag. Each record keeps source, licence and observation date.
