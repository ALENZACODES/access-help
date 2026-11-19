import { describe, expect, it } from 'vitest';
import {
  MAX_SOURCE_NAME,
  SOURCEEDIT_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseSourceRenameButtonId,
  plainLanguageIssues,
  readabilityIssues,
  renameSource,
  renderSourceRename,
  sourceGroups,
  sourceNameInputId,
  sourceRenameButtonId,
  sourceRenameMessage,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City opn data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const good: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-09-01' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('elevator', 'absent', town), c('grab-bar', 'present')] },
  { id: 'b', name: 'B', claims: [c('ramp', 'present', { ...city, source: ' City opn data ' }), c('elevator', 'present', good)] },
  { id: 'c', name: 'C', claims: [c('ramp', 'present', town)] },
];

describe('renameSource', () => {
  it('changes the name on every record from that source, whatever the outer spaces', () => {
    const r = renameSource(places, 'City opn data', 'City of Example');
    expect(r).toMatchObject({ outcome: 'renamed', changed: 2, name: 'City of Example' });
    expect(r.places[0]?.claims[0]?.provenance?.source).toBe('City of Example');
    expect(r.places[1]?.claims[0]?.provenance?.source).toBe('City of Example');
  });
  it('changes only the name: licence, date, tier and what was reported stay', () => {
    const r = renameSource(places, 'City opn data', 'X');
    expect(r.places[0]?.claims[0]).toEqual({ termId: 'ramp', status: 'present', provenance: { ...city, source: 'X' } });
  });
  it('leaves other records and untouched places as the same objects', () => {
    const r = renameSource(places, 'City opn data', 'X');
    expect(r.places[0]?.claims[1]).toBe(places[0]?.claims[1]);
    expect(r.places[0]?.claims[2]).toBe(places[0]?.claims[2]);
    expect(r.places[2]).toBe(places[2]);
  });
  it('lets two spellings become one source', () => {
    const r = renameSource(places, 'City opn data', 'City open data');
    expect(r.outcome).toBe('renamed');
    expect(sourceGroups(r.places).map((g) => g.source)).toEqual(['City open data', 'Town list']);
    expect(sourceGroups(r.places)[0]?.records).toBe(3);
  });
  it('cleans the new name', () => {
    expect(renameSource(places, 'Town list', '  Town   of  X ').name).toBe('Town of X');
  });
  it('refuses an empty or too long name, and the name it has', () => {
    expect(renameSource(places, 'Town list', '  ').outcome).toBe('empty');
    expect(renameSource(places, 'Town list', 'x'.repeat(MAX_SOURCE_NAME + 1)).outcome).toBe('too-long');
    expect(renameSource(places, 'Town list', 'Town list')).toMatchObject({ outcome: 'same', changed: 0 });
    expect(renameSource(places, 'Town list', ' Town list ').places).toBe(places);
  });
  it('says so when no record has that source', () => {
    expect(renameSource(places, 'Nobody', 'X')).toMatchObject({ outcome: 'missing', changed: 0 });
    expect(renameSource(places, '', 'X').outcome).toBe('missing');
    expect(renameSource([], 'Town list', 'X').outcome).toBe('missing');
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(places);
    renameSource(places, 'City opn data', 'X');
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('messages and ids', () => {
  it('says what was renamed and how many records changed', () => {
    expect(sourceRenameMessage(renameSource(places, 'City opn data', 'City open data'), 'City opn data', 'en')).toBe('Renamed the source City opn data to City open data. 2 records were changed.');
    expect(sourceRenameMessage(renameSource(places, 'Town list', 'Town'), 'Town list', 'fr')).toBe('La provenance Town list a été renommée Town. 2 fiches ont été changées.');
  });
  it('says why nothing was renamed', () => {
    expect(sourceRenameMessage(renameSource(places, 'Town list', ''), 'Town list', 'en')).toBe(SOURCEEDIT_UI.en.outcomes.empty);
    expect(sourceRenameMessage(renameSource(places, 'Nobody', 'X'), 'Nobody', 'en')).toBe(SOURCEEDIT_UI.en.outcomes.missing);
  });
  it('round-trips its ids', () => {
    expect(parseSourceRenameButtonId(sourceRenameButtonId(4))).toBe(4);
    for (const id of ['', 'gl-srcbtn-', 'gl-srcname-1', 'gl-renamebtn-1']) expect(parseSourceRenameButtonId(id), id).toBeNull();
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${renderSourceRename(['City <open> data', 'Town list'], lang)}</div>`, 'src')).toEqual([]);
  });
  it('is a closed block with a labelled box and a named button for each source', () => {
    const html = renderSourceRename(['City open data', 'Town list'], 'en');
    expect(html.startsWith('<details class="gl-srcrename"><summary>Correct the name of a source</summary>')).toBe(true);
    expect(html).toContain(`<label for="${sourceNameInputId(1)}">New name for the source Town list</label>`);
    expect(html).toContain(`maxlength="${MAX_SOURCE_NAME}" autocomplete="off" value="Town list"`);
    expect(html).toContain('id="gl-srcbtn-1" aria-label="Rename source: Town list">Rename source</button>');
  });
  it('is empty with no sources, and escapes names', () => {
    expect(renderSourceRename([], 'en')).toBe('');
    expect(renderSourceRename(['"><script>'], 'en')).not.toContain('<script>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = SOURCEEDIT_UI[lang];
    const texts = [ui.summary, ui.intro, ui.label('Ville'), ui.rename, ui.renameLabel('Ville'), ui.renamed('A', 'B'), ui.changed(1), ui.changed(3), ...Object.values(ui.outcomes)];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
