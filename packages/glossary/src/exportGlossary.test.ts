import { describe, expect, it } from 'vitest';
import {
  EXPORT_MIME,
  GLOSSARY_META,
  PLAIN_TERMS,
  exportFilename,
  exportGlossary,
  frenchIssues,
  lintCopy,
  type ExportFormat,
} from './index';

const formats: readonly ExportFormat[] = ['text', 'markdown', 'json'];

describe('exportGlossary', () => {
  it('writes plain text with a title, every term and the source line', () => {
    const t = exportGlossary('text', 'en');
    expect(t.startsWith('Glossary\n\n')).toBe(true);
    expect(t).toContain('Ramp: A gently sloped surface used instead of steps.');
    expect(t.trimEnd().endsWith('Date: 2026-11-15.')).toBe(true);
    for (const term of PLAIN_TERMS) expect(t).toContain(term.en.term);
  });

  it('writes Markdown bullets', () => {
    const t = exportGlossary('markdown', 'en');
    expect(t.startsWith('# Glossary')).toBe(true);
    expect(t).toContain('- **Elevator**: A lift that carries people between floors.');
  });

  it('writes French with no-break spaces before colons', () => {
    const t = exportGlossary('text', 'fr');
    expect(t.startsWith('Glossaire')).toBe(true);
    expect(t).toContain('Rampe : Une surface en pente douce qui remplace les marches.');
    expect(frenchIssues(t)).toEqual([]);
    expect(frenchIssues(exportGlossary('markdown', 'fr'))).toEqual([]);
  });

  it('writes JSON that parses and records the source', () => {
    const j = JSON.parse(exportGlossary('json', 'fr')) as {
      lang: string;
      source: typeof GLOSSARY_META;
      terms: { id: string; term: string; plain: string }[];
    };
    expect(j.lang).toBe('fr');
    expect(j.source).toEqual(GLOSSARY_META);
    expect(j.terms).toHaveLength(PLAIN_TERMS.length);
    expect(j.terms.find((x) => x.id === 'ramp')?.term).toBe('Rampe');
  });

  it('lists terms alphabetically in the chosen language', () => {
    const names = (JSON.parse(exportGlossary('json', 'en')) as { terms: { term: string }[] }).terms.map((x) => x.term);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('passes the wording rules in every format and language', () => {
    for (const f of formats) {
      for (const l of ['en', 'fr'] as const) expect(lintCopy(exportGlossary(f, l))).toEqual([]);
    }
  });
});

describe('exportFilename / EXPORT_MIME', () => {
  it('names files by language and format', () => {
    expect(exportFilename('text', 'en')).toBe('glossary-en.txt');
    expect(exportFilename('markdown', 'fr')).toBe('glossary-fr.md');
    expect(exportFilename('json', 'en')).toBe('glossary-en.json');
  });

  it('has a UTF-8 type for each text format', () => {
    expect(EXPORT_MIME.text).toContain('charset=utf-8');
    expect(EXPORT_MIME.markdown).toContain('charset=utf-8');
    expect(EXPORT_MIME.json).toBe('application/json');
  });
});
