import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATASET_KEY,
  attribution,
  buildDataset,
  datasetFromCsv,
  datasetProblems,
  loadDataset,
  parseDataset,
  saveDataset,
  serialiseDataset,
  type FeatureClaim,
  type IndexStore,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'OGL-Canada-2.0', date: '2026-10-01', url: 'https://example.org/d' };
const places: Place[] = [
  { id: 'a', name: 'Alpha', claims: [{ termId: 'ramp', status: 'present', provenance: prov }, { termId: 'elevator', status: 'unknown' }] },
  { id: 'b', name: 'Beta', claims: [] },
];

class Mem implements IndexStore {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

describe('datasetProblems', () => {
  it('is empty for a clean dataset', () => {
    expect(datasetProblems(places, prov, '2026-11-15')).toEqual([]);
  });

  it('reports provenance problems', () => {
    expect(datasetProblems(places, { ...prov, licence: 'Proprietary' })).toEqual(['licence-not-open']);
    expect(datasetProblems(places, { ...prov, date: '2030-01-01' }, '2026-11-15')).toEqual(['date-in-future']);
  });

  it('reports place problems', () => {
    expect(datasetProblems([...places, { id: 'a', name: 'Dup', claims: [] }], prov)).toEqual(['duplicate-place-id']);
    expect(datasetProblems([{ id: ' ', name: 'x', claims: [] }], prov)).toEqual(['empty-place-id']);
    expect(datasetProblems([{ id: 'x', name: ' ', claims: [] }], prov)).toEqual(['empty-place-name']);
  });

  it('reports unknown terms and claims without a source', () => {
    const bad: FeatureClaim[] = [
      { termId: 'nope', status: 'unknown' },
      { termId: 'ramp', status: 'present' },
      { termId: 'elevator', status: 'absent', provenance: { ...prov, licence: 'x' } },
    ];
    expect(datasetProblems([{ id: 'p', name: 'P', claims: bad }], prov)).toEqual([
      'unknown-term:nope',
      'unsourced-claim:p:ramp',
      'unsourced-claim:p:elevator',
    ]);
  });
});

describe('buildDataset', () => {
  it('builds with a checksum', () => {
    const { dataset, problems } = buildDataset(places, prov);
    expect(problems).toEqual([]);
    expect(dataset?.version).toBe(1);
    expect(dataset?.checksum).toHaveLength(8);
    expect(dataset?.places).toBe(places);
  });

  it('refuses to build with problems', () => {
    expect(buildDataset(places, { ...prov, source: '' })).toEqual({ dataset: null, problems: ['source-missing'] });
  });
});

describe('parseDataset', () => {
  const dataset = buildDataset(places, prov).dataset!;
  const json = serialiseDataset(dataset);

  it('round-trips', () => {
    expect(parseDataset(json)).toEqual(dataset);
  });

  it('rejects garbage and wrong shapes', () => {
    for (const bad of ['', 'nope', 'null', '[]', '{}', JSON.stringify({ ...dataset, version: 2 }), JSON.stringify({ ...dataset, places: 'x' }), JSON.stringify({ ...dataset, provenance: { source: 1 } }), JSON.stringify({ ...dataset, places: [{ id: 1 }] }), JSON.stringify({ ...dataset, places: [{ id: 'a', name: 'A', claims: [{ termId: 'ramp', status: 'maybe' }] }] })]) {
      expect(parseDataset(bad), bad).toBeNull();
    }
  });

  it('rejects edited content', () => {
    expect(parseDataset(json.replace('Alpha', 'Alpho'))).toBeNull();
    expect(parseDataset(json.replace('present', 'absent'))).toBeNull();
  });

  it('rejects data whose licence or sources were stripped, even with a fixed checksum', () => {
    const stripped = { ...dataset, provenance: { ...dataset.provenance, licence: 'Proprietary' } };
    expect(parseDataset(JSON.stringify(stripped))).toBeNull();
  });
});

describe('loadDataset / saveDataset', () => {
  const dataset = buildDataset(places, prov).dataset!;

  it('saves and loads', () => {
    const store = new Mem();
    expect(saveDataset(store, dataset)).toBe(true);
    expect(store.m.has(DEFAULT_DATASET_KEY)).toBe(true);
    expect(loadDataset(store)).toEqual(dataset);
  });

  it('returns null for missing, corrupt or throwing storage', () => {
    expect(loadDataset(new Mem())).toBeNull();
    const bad = new Mem();
    bad.setItem(DEFAULT_DATASET_KEY, '{"oops"');
    expect(loadDataset(bad)).toBeNull();
    const hostile: IndexStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadDataset(hostile)).toBeNull();
    expect(saveDataset(hostile, dataset)).toBe(false);
  });

  it('supports a custom key', () => {
    const store = new Mem();
    saveDataset(store, dataset, 'k');
    expect(loadDataset(store, 'k')).toEqual(dataset);
    expect(loadDataset(store)).toBeNull();
  });
});

describe('datasetFromCsv / attribution', () => {
  const csv = 'id,name,ramp\na,Alpha,present\nb,Beta,absent';
  const options = { idColumn: 'id', nameColumn: 'name', featureColumns: { ramp: 'ramp' }, provenance: prov, today: '2026-11-15' };

  it('goes from CSV to a stored-ready dataset', () => {
    const r = datasetFromCsv(csv, options);
    expect(r.problems).toEqual([]);
    expect(r.dataset?.places.map((p) => p.name)).toEqual(['Alpha', 'Beta']);
    expect(parseDataset(serialiseDataset(r.dataset!))).not.toBeNull();
  });

  it('gives no dataset when the import has problems', () => {
    const r = datasetFromCsv(csv, { ...options, provenance: { ...prov, licence: 'x' } });
    expect(r.dataset).toBeNull();
    expect(r.result.problems).toContain('provenance-invalid');
  });

  it('writes the source line in both languages', () => {
    const d = buildDataset(places, prov).dataset!;
    expect(attribution(d, 'en')).toBe('Source: City open data. Licence: OGL-Canada-2.0. Date: 2026-10-01.');
    expect(attribution(d, 'fr')).toBe('Source : City open data. Licence : OGL-Canada-2.0. Date : 2026-10-01.');
  });
});
