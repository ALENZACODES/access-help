import { describe, expect, it } from 'vitest';
import {
  attributeText,
  collapseSpelledOut,
  decodeEntities,
  elementText,
  hasInvisibleCharacters,
  normaliseForScan,
  passesScan,
  scanMarkup,
  scanText,
} from './index';

const rules = (text: string): string[] => [...new Set(scanText(text).map((f) => f.rule))];
const SOFT_HYPHEN = String.fromCharCode(0xad);
const ZERO_WIDTH = String.fromCharCode(0x200b);
const BIDI = String.fromCharCode(0x202e);
const forbiddenOrg = [83, 67, 73, 79].map((n) => String.fromCharCode(n)).join('');

describe('decodeEntities', () => {
  it('decodes numeric, hex and common named entities', () => {
    expect(decodeEntities('&#118;&#x65;rified &amp; &quot;x&quot;')).toBe('verified & "x"');
    expect(decodeEntities('d&eacute;j&agrave;')).toBe('déjà');
  });

  it('leaves unknown or out-of-range entities alone', () => {
    expect(decodeEntities('&nonsense; &#99999999;')).toBe('&nonsense; &#99999999;');
  });
});

describe('normaliseForScan', () => {
  it('removes soft hyphens, zero-width and direction characters', () => {
    expect(normaliseForScan(`ver${SOFT_HYPHEN}if${ZERO_WIDTH}ied${BIDI}`)).toBe('verified');
  });

  it('turns full-width letters into plain letters', () => {
    expect(normaliseForScan('ｖｅｒｉｆｉｅｄ')).toBe('verified');
  });

  it('keeps ordinary French text', () => {
    expect(normaliseForScan('Entrée de plain-pied')).toBe('Entrée de plain-pied');
  });
});

describe('collapseSpelledOut', () => {
  it('joins long runs of single letters', () => {
    expect(collapseSpelledOut('v e r i f i e d')).toBe('verified');
    expect(collapseSpelledOut('v-e-r-i-f-i-e-d now')).toBe('verified now');
    expect(collapseSpelledOut('g.u.a.r.a.n.t.e.e')).toBe('guarantee');
  });

  it('leaves short runs and ordinary text alone', () => {
    expect(collapseSpelledOut('a b c')).toBe('a b c');
    expect(collapseSpelledOut('Go to A or B')).toBe('Go to A or B');
    expect(collapseSpelledOut('step-free entrance')).toBe('step-free entrance');
  });
});

describe('scanText: hidden banned words are still found', () => {
  it('finds a plain banned word as written', () => {
    expect(scanText('Verified by our team')[0]).toMatchObject({ rule: 'no-verification-claim', view: 'as-written' });
  });

  it.each([
    [`ver${SOFT_HYPHEN}ified`, 'soft hyphen'],
    [`ver${ZERO_WIDTH}ified`, 'zero-width space'],
    ['&#118;erified', 'numeric entity'],
    ['ｖｅｒｉｆｉｅｄ', 'full-width letters'],
    ['v e r i f i e d', 'spaced out'],
    ['V.E.R.I.F.I.E.D', 'dotted'],
  ])('finds "verified" hidden with %s', (text) => {
    expect(rules(text)).toContain('no-verification-claim');
  });

  it('finds real-time, partnership and guarantee hidden the same way', () => {
    expect(rules(`real${ZERO_WIDTH}-time updates`)).toContain('no-realtime-claim');
    expect(rules('part&#110;ership')).toContain('no-partnership-claim');
    expect(rules('g u a r a n t e e')).toContain('no-verification-claim');
  });

  it('finds the forbidden organisation name however it is split', () => {
    expect(rules(forbiddenOrg)).not.toEqual([]);
    expect(rules(forbiddenOrg.split('').join(ZERO_WIDTH))).not.toEqual([]);
    expect(rules(forbiddenOrg.split('').join(' '))).not.toEqual([]);
  });

  it('finds unsafe claims hidden the same way', () => {
    expect(rules(`fully${ZERO_WIDTH} accessible`)).toContain('no-absolute-accessible');
    expect(rules('b&#97;rrier-free')).toContain('no-barrier-free');
  });

  it('reports which view found it', () => {
    expect(scanText(`ver${SOFT_HYPHEN}ified`).find((f) => f.rule === 'no-verification-claim')?.view).toBe('cleaned');
    expect(scanText('v e r i f i e d').find((f) => f.rule === 'no-verification-claim')?.view).toBe('spelled-out');
  });

  it('reports invisible characters on their own', () => {
    expect(rules(`Hello${ZERO_WIDTH}`)).toEqual(['hidden-characters']);
    expect(hasInvisibleCharacters(`a${BIDI}b`)).toBe(true);
    expect(hasInvisibleCharacters('plain text, déjà vu')).toBe(false);
  });

  it('does not repeat a finding that appears in several views', () => {
    const f = scanText('Verified verified');
    expect(f.filter((x) => x.rule === 'no-verification-claim')).toHaveLength(1);
  });

  it('passes ordinary EN and FR wording', () => {
    expect(passesScan('Unknown means we have no information.')).toBe(true);
    expect(passesScan('Une entrée sans marche entre l’extérieur et l’intérieur.')).toBe(true);
    expect(passesScan('Go to A or B, then C.')).toBe(true);
  });
});

describe('markup: text, attributes and comments', () => {
  it('extracts text attributes and decodes them', () => {
    const html = '<button aria-label="Save &amp; go" title=\'Tip\'>x</button><img alt="Photo"><input placeholder="Type">';
    expect(attributeText(html)).toEqual(['Save & go', 'Tip', 'Photo', 'Type']);
  });

  it('ignores empty attributes and attributes that are not text', () => {
    expect(attributeText('<a href="/x" class="y" aria-label="">z</a>')).toEqual([]);
  });

  it('reads element text with spaces between tags and without scripts or styles', () => {
    expect(elementText('<p>One</p><p>Two</p><style>.a{}</style><script>var x</script>')).toBe('One Two');
  });

  it('finds banned wording in visible text', () => {
    expect(scanMarkup('<p>Verified listing</p>')).toMatchObject([{ rule: 'no-verification-claim', where: 'text' }]);
  });

  it('finds banned wording that only appears in an attribute', () => {
    const found = scanMarkup('<button aria-label="Real-time map">Map</button>');
    expect(found).toMatchObject([{ rule: 'no-realtime-claim', where: 'attribute' }]);
  });

  it('finds unsafe claims in titles and alt text', () => {
    expect(scanMarkup('<img alt="A fully accessible entrance">').map((f) => f.rule)).toContain('no-absolute-accessible');
    expect(scanMarkup('<a href="/x" title="Official site">Go</a>').map((f) => f.rule)).toContain('no-official-claim');
  });

  it('finds wording hidden in an HTML comment', () => {
    const f = scanMarkup('<p>Hi</p><!-- verified by staff -->');
    expect(f[0]?.match).toContain('comment:');
  });

  it('finds words split across tags', () => {
    expect(scanMarkup('<p>Real<span>-time</span> data</p>').map((f) => f.rule)).toContain('no-realtime-claim');
  });

  it('passes clean markup', () => {
    expect(scanMarkup('<section><h2>Help</h2><p>Unknown means no information.</p><button aria-label="Save Library">Save</button></section>')).toEqual([]);
  });
});
