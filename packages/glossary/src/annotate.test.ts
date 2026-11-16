import { describe, expect, it } from 'vitest';
import { annotate, annotateToHtml } from './index';

describe('annotate', () => {
  it('returns one text segment when nothing matches', () => {
    expect(annotate('Nothing to see here', 'en')).toEqual([{ kind: 'text', text: 'Nothing to see here' }]);
    expect(annotate('', 'en')).toEqual([]);
  });

  it('splits text around a term and keeps original casing', () => {
    expect(annotate('Use the Ramp today', 'en')).toEqual([
      { kind: 'text', text: 'Use the ' },
      { kind: 'term', text: 'Ramp', id: 'ramp' },
      { kind: 'text', text: ' today' },
    ]);
  });

  it('matches whole words only', () => {
    expect(annotate('The ramps and the trampoline', 'en').every((s) => s.kind === 'text')).toBe(true);
  });

  it('finds several terms in order', () => {
    const ids = annotate('An elevator, a ramp and a grab bar.', 'en')
      .filter((s) => s.kind === 'term')
      .map((s) => (s.kind === 'term' ? s.id : ''));
    expect(ids).toEqual(['elevator', 'ramp', 'grab-bar']);
  });

  it('prefers the longest term and does not overlap', () => {
    const segs = annotate('Accessible washroom', 'en');
    expect(segs).toEqual([{ kind: 'term', text: 'Accessible washroom', id: 'accessible-washroom' }]);
  });

  it('is accent- and apostrophe-insensitive in French', () => {
    const segs = annotate("La barre d'appui et l'entree de plain-pied", 'fr');
    const ids = segs.flatMap((s) => (s.kind === 'term' ? [s.id] : []));
    expect(ids).toEqual(['grab-bar', 'step-free-entrance']);
  });

  it('keeps all the original text', () => {
    const input = 'Une Rampe, un ascenseur; et des toilettes accessibles !';
    expect(
      annotate(input, 'fr')
        .map((s) => s.text)
        .join(''),
    ).toBe(input);
  });

  it('does not match English terms in French mode', () => {
    expect(annotate('Elevator', 'fr').every((s) => s.kind === 'text')).toBe(true);
  });
});

describe('annotateToHtml', () => {
  it('links terms to their entries and escapes everything else', () => {
    expect(annotateToHtml('<b>Ramp</b> & more', 'en')).toBe(
      '&lt;b&gt;<a class="gl-term" href="#glossary-ramp">Ramp</a>&lt;/b&gt; &amp; more',
    );
  });
});
