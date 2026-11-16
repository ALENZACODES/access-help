import { describe, expect, it } from 'vitest';
import {
  ANNOUNCE_REGION,
  ANNOUNCE_UI,
  announcement,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  nextAnnouncement,
  renderAnnouncement,
  type AnnounceKind,
  type Lang,
} from './index';

const kinds = Object.keys(ANNOUNCE_UI.en) as AnnounceKind[];

describe('ANNOUNCE_UI', () => {
  it('has the same kinds in both languages', () => {
    expect(Object.keys(ANNOUNCE_UI.fr).sort()).toEqual([...kinds].sort());
  });
  it('has the same kind of entry (text or function) in both languages', () => {
    for (const k of kinds) expect(typeof ANNOUNCE_UI.fr[k]).toBe(typeof ANNOUNCE_UI.en[k]);
  });
});

describe('announcement', () => {
  it('puts the name into messages that have one', () => {
    expect(announcement('saved', 'en', 'Café Nord')).toBe('Saved Café Nord.');
    expect(announcement('unsaved', 'en', 'Library')).toBe('Removed Library from saved places.');
    expect(announcement('saved', 'fr', 'Café Nord')).toBe('Café Nord enregistré.');
  });
  it('gives fixed text for messages with no name', () => {
    expect(announcement('cleared', 'en')).toBe('Choices cleared.');
    expect(announcement('undone', 'fr')).toBe('Action annulée.');
  });
  it('ignores a name given to a fixed message', () => {
    expect(announcement('cleared', 'en', 'x')).toBe('Choices cleared.');
  });
  it.each(['en', 'fr'] as Lang[])('passes every rule for every kind in %s', (lang) => {
    for (const k of kinds) {
      const text = announcement(k, lang, 'Café Nord');
      expect(text, k).not.toBe('');
      expect(lintCopy(text), k).toEqual([]);
      expect(lintClaims(text), k).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), k).toEqual([]);
    }
  });
  it('is short: one sentence of at most twelve words', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const k of kinds) {
        const text = announcement(k, lang, 'Place');
        expect(text.split(/[.!?]/).filter((s) => s.trim() !== '').length, `${lang} ${k}`).toBe(1);
        expect(text.split(/\s+/).length, `${lang} ${k}`).toBeLessThanOrEqual(12);
      }
    }
  });
  it('says nothing about whether a place is accessible', () => {
    for (const lang of ['en', 'fr'] as Lang[]) for (const k of kinds) expect(announcement(k, lang, 'X')).not.toMatch(/accessib|verified|v[ée]rifi/i);
  });
});

describe('nextAnnouncement', () => {
  it('returns new text as it is', () => {
    expect(nextAnnouncement('', 'Saved X.')).toBe('Saved X.');
    expect(nextAnnouncement('Saved X.', 'Removed X.')).toBe('Removed X.');
  });
  it('changes a repeat so the region changes', () => {
    const first = nextAnnouncement('', 'Saved X.');
    const second = nextAnnouncement(first, 'Saved X.');
    expect(second).not.toBe(first);
    expect(second.trim()).toBe('Saved X.');
  });
  it('alternates on many repeats', () => {
    let last = nextAnnouncement('', 'Saved X.');
    for (let i = 0; i < 4; i += 1) {
      const next = nextAnnouncement(last, 'Saved X.');
      expect(next).not.toBe(last);
      last = next;
    }
  });
  it('is empty for empty text', () => {
    expect(nextAnnouncement('x', '')).toBe('');
  });
});

describe('renderAnnouncement and the region', () => {
  it('escapes text', () => {
    expect(renderAnnouncement('Saved <b>X</b> & Y.')).toBe('Saved &lt;b&gt;X&lt;/b&gt; &amp; Y.');
  });
  it('is a polite, atomic status region, empty at first', () => {
    expect(ANNOUNCE_REGION).toContain('role="status"');
    expect(ANNOUNCE_REGION).toContain('aria-live="polite"');
    expect(ANNOUNCE_REGION).toContain('aria-atomic="true"');
    expect(ANNOUNCE_REGION).toMatch(/><\/p>$/);
    expect(auditHtml(`<div lang="en">${ANNOUNCE_REGION}</div>`, 'region')).toEqual([]);
  });
});
