# Offline packs and data status

- `pack.ts`: builds an offline pack (manifest + GeoJSON) from reviewed records. The manifest keeps sources, licences, observation dates and the UNKNOWN count. No network access and no tile servers.
- `../data-status/explain.ts`: one plain sentence per record in EN or FR, with a freshness label (recent, older, unknown). UNKNOWN is stated, never inferred.
- `../index.ts`: package index; both modules are exported from there and `pack.test.ts` imports through it.
- Run tests: `npx vitest run docs`.

The sentences describe what was recorded and when. They are not medical or eligibility advice.
