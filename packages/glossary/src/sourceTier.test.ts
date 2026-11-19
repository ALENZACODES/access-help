import { describe, expect, it } from 'vitest';
import {
  EMITTED_TIERS,
  TIER_IDS,
  TIER_UI,
  auditHtml,
  effectiveTier,
  frenchIssues,
  isTier,
  lintClaims,
  lintCopy,
  parseTier,
  plainLanguageIssues,
  readabilityIssues,
  recordLine,
  recordTierProblems,
  renderTierLegend,
  tierCounts,
  tierLine,
  tierName,
  tierProblem,
  validateProvenance,
  withTier,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const base: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const t = (tier: string): Provenance => ({ ...base, tier });
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

describe('parseTier', () => {
  it('reads the canonical ids', () => {
    for (const id of TIER_IDS) expect(parseTier(id)).toBe(id);
  });
  it('reads the forms found in data files', () => {
    expect(parseTier('Tier 1')).toBe('tier-1');
    expect(parseTier('TIER-0')).toBe('tier-0');
    expect(parseTier('niveau 1')).toBe('tier-1');
    expect(parseTier(' 1 ')).toBe('tier-1');
    expect(parseTier(0)).toBe('tier-0');
    expect(parseTier('E')).toBe('tier-e');
    expect(parseTier('tier e')).toBe('tier-e');
  });
  it('is null for anything that is not a whole tier label', () => {
    for (const bad of ['', ' ', '5', '11', 'tier 1b', 'tier', 'one', 'tier-1 ok', '-1', '1.0', null, undefined, true, 1.5, 9, {}, []]) {
      expect(parseTier(bad), String(bad)).toBeNull();
    }
  });
  it('checks a value', () => {
    expect(isTier('tier-1')).toBe(true);
    for (const bad of ['Tier 1', '1', 1, null, 'constructor']) expect(isTier(bad), String(bad)).toBe(false);
  });
});

describe('what may be shown', () => {
  it('shows the tiers this version produces', () => {
    expect(EMITTED_TIERS).toEqual(['tier-0', 'tier-1']);
    expect(effectiveTier(t('tier-0'))).toBe('tier-0');
    expect(effectiveTier(t('Tier 1'))).toBe('tier-1');
    expect(tierProblem(t('tier-1'))).toBeNull();
  });
  it('never shows a higher tier, because it holds no evidence for one', () => {
    for (const high of ['tier-2', 'tier-3', 'tier-4', 'tier-e']) {
      expect(effectiveTier(t(high)), high).toBeNull();
      expect(tierProblem(t(high)), high).toBe('tier-needs-evidence');
    }
  });
  it('shows no tier when there is none or it is not known', () => {
    expect(effectiveTier(base)).toBeNull();
    expect(tierProblem(base)).toBe('tier-missing');
    expect(tierProblem(t('  '))).toBe('tier-missing');
    expect(tierProblem(t('gold'))).toBe('tier-not-known');
    expect(effectiveTier(t('gold'))).toBeNull();
    expect(effectiveTier(null)).toBeNull();
    expect(effectiveTier(undefined)).toBeNull();
  });
  it('adds a tier to a source without changing the rest, and ignores a bad one', () => {
    expect(withTier(base, 'Tier 1')).toEqual({ ...base, tier: 'tier-1' });
    expect(withTier(base, 'gold')).toBe(base);
    expect(base).not.toHaveProperty('tier');
  });
  it('does not make a source with a tier less usable', () => {
    expect(validateProvenance(t('tier-1'))).toEqual([]);
    expect(validateProvenance(t('gold'))).toEqual([]);
  });
});

describe('texts', () => {
  it('names a tier, and says unknown for none', () => {
    expect(tierName('tier-1', 'en')).toBe('Tier 1');
    expect(tierName('tier-1', 'fr')).toBe('Niveau 1');
    expect(tierName(null, 'en')).toBe('Tier unknown');
    expect(tierName(null, 'fr')).toBe('Niveau inconnu');
  });
  it('writes the end of a source line', () => {
    expect(tierLine(t('tier-1'), 'en')).toBe('Tier: 1.');
    expect(tierLine(base, 'en')).toBe('Tier: unknown.');
    expect(tierLine(t('tier-3'), 'en')).toBe('Tier: unknown.');
    expect(tierLine(t('tier-0'), 'fr')).toBe('Niveau\u00a0: 0.');
    expect(tierLine(undefined, 'fr')).toBe('Niveau\u00a0: inconnu.');
  });
  it('writes source, licence, date and tier for a record', () => {
    expect(recordLine(t('tier-1'), 'en')).toBe('Source: City open data. Licence: CC0-1.0. Date: 2026-10-01. Tier: 1.');
    expect(recordLine(base, 'fr')).toBe('Source\u00a0: City open data. Licence\u00a0: CC0-1.0. Date\u00a0: 2026-10-01. Niveau\u00a0: inconnu.');
  });
});

describe('counting', () => {
  const places: Place[] = [
    { id: 'a', name: 'A', claims: [c('ramp', 'present', t('tier-1')), c('elevator', 'absent', t('tier-0')), c('grab-bar', 'unknown', t('tier-1'))] },
    { id: 'b', name: 'B', claims: [c('ramp', 'present', base), c('elevator', 'present', t('tier-3')), c('grab-bar', 'present')] },
    { id: 'c', name: 'C', claims: [c('ramp', 'present', t('gold'))] },
  ];
  it('counts records that say something, by the tier that may be shown', () => {
    const counts = tierCounts(places);
    expect(counts.total).toBe(5);
    expect(counts.byTier['tier-1']).toBe(1);
    expect(counts.byTier['tier-0']).toBe(1);
    expect(counts.byTier['tier-3']).toBe(0);
    expect(counts.unknown).toBe(3);
  });
  it('adds up', () => {
    const counts = tierCounts(places);
    expect(Object.values(counts.byTier).reduce((a, b) => a + b, 0) + counts.unknown).toBe(counts.total);
  });
  it('is all zero with no places', () => {
    expect(tierCounts([])).toEqual({ byTier: { 'tier-0': 0, 'tier-1': 0, 'tier-2': 0, 'tier-3': 0, 'tier-4': 0, 'tier-e': 0 }, unknown: 0, total: 0 });
  });
  it('lists each record whose tier cannot be shown', () => {
    expect(recordTierProblems(places)).toEqual(['tier-missing:b:ramp', 'tier-needs-evidence:b:elevator', 'tier-not-known:c:ramp']);
  });
  it('has no problems for records that say nothing', () => {
    expect(recordTierProblems([{ id: 'x', name: 'X', claims: [c('ramp', 'unknown'), c('elevator', 'present')] }])).toEqual([]);
  });
});

describe('legend', () => {
  const places: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present', t('tier-1')), c('elevator', 'absent', base)] }];
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderTierLegend(tierCounts(places), lang), renderTierLegend(tierCounts([]), lang)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'tiers')).toEqual([]);
    }
  });
  it('explains each tier it can show, with a count, and the unknown tier', () => {
    const html = renderTierLegend(tierCounts(places), 'en');
    expect(html).toContain('Tier 0: evidence may be missing. <span class="gl-note">(0 records)</span>');
    expect(html).toContain('(1 record)');
    expect(html).toContain('Tier unknown:');
    expect(html).not.toContain('Tier 2');
  });
  it('says so with no records', () => {
    expect(renderTierLegend(tierCounts([]), 'en')).toContain(TIER_UI.en.none);
  });
  it('never calls a tier a promise', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      expect(renderTierLegend(tierCounts(places), lang)).not.toMatch(/accessible|guarantee|garanti/i);
    }
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = TIER_UI[lang];
    const texts = [
      ui.heading, ui.intro, ...Object.values(ui.names), ui.unknown, ui.line('1'), ui.valueUnknown, ...Object.values(ui.about), ui.aboutUnknown,
      ui.count(1), ui.count(4), ui.none, ...Object.values(ui.problems),
    ];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
