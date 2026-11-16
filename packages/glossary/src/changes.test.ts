import { describe, expect, it } from 'vitest';
import {
  CHANGES_UI,
  MAX_CHANGES_SHOWN,
  NO_CHANGES,
  auditHtml,
  changeSummary,
  describeChange,
  diffPlaces,
  frenchIssues,
  hasChanges,
  lintCopy,
  renderChanges,
  type FeatureClaim,
  type Place,
} from './index';

const prov = (source = 'City open data') => ({ source, licence: 'CC0-1.0', date: '2026-06-01' }) as const;
const claim = (termId: string, status: FeatureClaim['status'], source?: string): FeatureClaim => ({
  termId,
  status,
  provenance: prov(source),
});
const place = (id: string, claims: FeatureClaim[] = [], name = id.toUpperCase()): Place => ({ id, name, claims });

describe('diffPlaces', () => {
  it('finds nothing when nothing changed, even with a different order', () => {
    const a = [place('a', [claim('ramp', 'present')]), place('b')];
    expect(diffPlaces(a, [a[1] as Place, a[0] as Place])).toEqual(NO_CHANGES);
  });

  it('finds added and removed places by id', () => {
    const d = diffPlaces([place('a'), place('b')], [place('b'), place('c')]);
    expect(d.added.map((p) => p.id)).toEqual(['c']);
    expect(d.removed.map((p) => p.id)).toEqual(['a']);
    expect(d.changed).toEqual([]);
  });

  it('finds a feature that went from unknown to a sourced answer', () => {
    const d = diffPlaces([place('a')], [place('a', [claim('ramp', 'present')])]);
    expect(d.changed).toEqual([{ placeId: 'a', placeName: 'A', termId: 'ramp', from: 'unknown', to: 'present' }]);
  });

  it('finds an answer that flipped', () => {
    const d = diffPlaces([place('a', [claim('ramp', 'present')])], [place('a', [claim('ramp', 'absent')])]);
    expect(d.changed[0]).toMatchObject({ from: 'present', to: 'absent' });
  });

  it('counts a lost source as a change to unknown, since an unsourced claim is unknown', () => {
    const d = diffPlaces([place('a', [claim('ramp', 'present')])], [place('a', [{ termId: 'ramp', status: 'present' }])]);
    expect(d.changed[0]).toMatchObject({ from: 'present', to: 'unknown' });
  });

  it('reports disagreeing sources as a conflict', () => {
    const d = diffPlaces(
      [place('a', [claim('ramp', 'present')])],
      [place('a', [claim('ramp', 'present'), claim('ramp', 'absent', 'Other source')])],
    );
    expect(d.changed[0]).toMatchObject({ from: 'present', to: 'conflict' });
  });

  it('ignores changes to claims about things that are not glossary terms', () => {
    const d = diffPlaces([place('a')], [place('a', [claim('made-up', 'present')])]);
    expect(d.changed).toEqual([]);
  });

  it('does not report a rename as a change', () => {
    expect(hasChanges(diffPlaces([place('a', [], 'Old')], [place('a', [], 'New')]))).toBe(false);
  });
});

describe('changeSummary', () => {
  it('is null when nothing changed', () => {
    expect(changeSummary(NO_CHANGES, 'en')).toBeNull();
    expect(changeSummary(NO_CHANGES, 'fr')).toBeNull();
  });

  it('counts and pluralises in English', () => {
    const one = diffPlaces([], [place('a')]);
    expect(changeSummary(one, 'en')).toBe('Data updated: 1 place added.');
    const many = diffPlaces([place('x'), place('y')], [place('a'), place('b'), place('c')]);
    expect(changeSummary(many, 'en')).toBe('Data updated: 3 places added, 2 places removed.');
  });

  it('counts and pluralises in French with correct spacing', () => {
    const d = diffPlaces([place('a')], [place('a', [claim('ramp', 'present'), claim('elevator', 'absent')])]);
    const text = changeSummary(d, 'fr') ?? '';
    expect(text).toBe('Données mises à jour : 2 caractéristiques modifiées.');
    expect(frenchIssues(text)).toEqual([]);
    expect(changeSummary(diffPlaces([], [place('a')]), 'fr')).toContain('1 lieu ajouté');
  });
});

describe('describeChange', () => {
  const c = { placeId: 'a', placeName: 'Library', termId: 'elevator', from: 'unknown', to: 'present' } as const;

  it('says what changed in plain words', () => {
    expect(describeChange(c, 'en')).toBe('Library: Elevator changed from unknown to reported as available.');
  });

  it('shows a conflict as sources disagreeing', () => {
    expect(describeChange({ ...c, to: 'conflict' }, 'en')).toContain('to sources disagree');
  });

  it('is clean French', () => {
    const t = describeChange(c, 'fr');
    expect(t).toContain('«\u202finconnu\u202f»');
    expect(frenchIssues(t)).toEqual([]);
  });
});

describe('renderChanges', () => {
  it('is empty when nothing changed', () => {
    expect(renderChanges(NO_CHANGES, 'en')).toBe('');
  });

  it('is a status message with a collapsed list of every kind of change', () => {
    const d = diffPlaces([place('a'), place('b')], [place('a', [claim('ramp', 'present')]), place('c', [], 'Café')]);
    const html = renderChanges(d, 'en');
    expect(html).toContain('role="status"');
    expect(html).toContain('<details><summary>What changed</summary>');
    expect(html).toContain('Added: Café');
    expect(html).toContain('Removed: B');
    expect(html).toContain('A: Ramp changed from unknown to reported as available.');
  });

  it('limits the list and says how many more there are', () => {
    const many = Array.from({ length: MAX_CHANGES_SHOWN + 5 }, (_, i) => place(`p${i}`));
    const html = renderChanges(diffPlaces([], many), 'en');
    expect(html.match(/<li>/g)).toHaveLength(MAX_CHANGES_SHOWN);
    expect(html).toContain('And 5 more changes.');
    expect(renderChanges(diffPlaces([], many), 'en', 0).match(/<li>/g)).toBeNull();
  });

  it('escapes place names', () => {
    const html = renderChanges(diffPlaces([], [place('a', [], '<img src=x onerror=alert(1)>')]), 'en');
    expect(html).not.toContain('<img');
  });

  it('passes the HTML audit and wording checks in both languages', () => {
    const d = diffPlaces([place('a')], [place('a', [claim('ramp', 'present')]), place('b')]);
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}">${renderChanges(d, lang)}</div>`;
      expect(auditHtml(`changes.${lang}`, html).filter((f) => f.severity === 'error')).toEqual([]);
      expect(lintCopy(html.replace(/<[^>]+>/g, ' '))).toEqual([]);
      expect(frenchIssues(CHANGES_UI.fr.heading)).toEqual([]);
    }
  });
});
