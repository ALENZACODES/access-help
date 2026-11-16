import { describe, expect, it } from 'vitest';
import {
  PLACE_CSS,
  auditHtml,
  matchPlace,
  rankPlaces,
  renderPlaceCard,
  renderPlaceList,
  type FeatureClaim,
  type Place,
} from './index';

const prov = { source: 'Site survey notes', licence: 'CC-BY-4.0', date: '2026-10-01' };
const old = { source: 'Old survey', licence: 'CC0-1.0', date: '2025-06-01' };
const claim = (termId: string, status: 'present' | 'absent', p = prov): FeatureClaim => ({ termId, status, provenance: p });
const today = '2026-11-15';

describe('renderPlaceCard', () => {
  const place: Place = { id: 'lib', name: 'Main Library', claims: [claim('ramp', 'present'), claim('elevator', 'absent', old)] };
  const match = matchPlace(place, ['ramp', 'elevator', 'grab-bar']);

  it('shows name, verdict, counts and each chosen feature', () => {
    const html = renderPlaceCard(match, 'en', today);
    expect(html).toContain('<h3 id="place-0-lib">Main Library</h3>');
    expect(html).toContain('data-verdict="some-not-available"');
    expect(html).toContain('1 of 3 features you chose is reported as not available.');
    expect(html).toContain('data-outcome="met"');
    expect(html).toContain('data-outcome="not-met"');
    expect(html).toContain('data-outcome="unknown"');
    expect(html).toContain('Ramp: reported as available.');
  });

  it('shows the source line and only notes age when the information is old', () => {
    const html = renderPlaceCard(match, 'en', today);
    expect(html).toContain('Source: Site survey notes. Licence: CC-BY-4.0. Date: 2026-10-01.');
    expect(html).toContain('Information is getting old.');
    expect((html.match(/getting old/g) ?? []).length).toBe(1);
  });

  it('renders French', () => {
    const html = renderPlaceCard(match, 'fr', today);
    expect(html).toContain('Rampe : signalé comme disponible.');
    expect(html).toContain('Caractéristiques');
  });

  it('omits the feature list when nothing was chosen', () => {
    const html = renderPlaceCard(matchPlace(place, []), 'en', today);
    expect(html).not.toContain('<ul class="gl-features">');
    expect(html).toContain('No features chosen.');
  });

  it('escapes the name and makes a safe id', () => {
    const evil = matchPlace({ id: 'A "b" <c>', name: '<script>x</script>', claims: [] }, ['ramp']);
    const html = renderPlaceCard(evil, 'en', today);
    expect(html).not.toContain('<script>');
    expect(html).toMatch(/id="place-0-a-b-c"/);
  });

  it('falls back to a plain id slug', () => {
    expect(renderPlaceCard(matchPlace({ id: '!!!', name: 'X', claims: [] }, []), 'en', today)).toContain('id="place-0-place"');
  });
});

describe('renderPlaceList', () => {
  const places: Place[] = [
    { id: 'a', name: 'Alpha', claims: [claim('ramp', 'present')] },
    { id: 'a', name: 'Alpha again', claims: [] },
  ];
  const ranked = rankPlaces(places, ['ramp']);

  it('renders a labelled section with the right language', () => {
    const html = renderPlaceList(ranked, 'fr', today);
    expect(html).toContain('lang="fr-CA"');
    expect(html).toContain('<h2 id="gl-places-title">Lieux</h2>');
  });

  it('gives each card a unique id even when place ids repeat', () => {
    const html = renderPlaceList(ranked, 'en', today);
    expect(html).toContain('id="place-0-a"');
    expect(html).toContain('id="place-1-a"');
    expect(auditHtml(html)).toEqual([]);
  });

  it('shows a message for no places', () => {
    expect(renderPlaceList([], 'en', today)).toContain('No places to show.');
    expect(renderPlaceList([], 'fr', today)).toContain('Aucun lieu à afficher.');
  });
});

describe('PLACE_CSS', () => {
  it('keeps note text at 14px or larger', () => {
    expect(PLACE_CSS).toContain('font-size: 0.875rem');
  });
});
