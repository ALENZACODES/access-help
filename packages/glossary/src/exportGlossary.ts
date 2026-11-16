import { fixFrench } from './frTypography';
import { listTerms } from './glossary';
import { formatProvenance } from './provenance';
import { GLOSSARY_META, type Lang } from './plainTerms';

export type ExportFormat = 'text' | 'markdown' | 'json';

export const EXPORT_MIME: Readonly<Record<ExportFormat, string>> = {
  text: 'text/plain;charset=utf-8',
  markdown: 'text/markdown;charset=utf-8',
  json: 'application/json',
};

const EXTENSION: Readonly<Record<ExportFormat, string>> = { text: 'txt', markdown: 'md', json: 'json' };
const TITLE: Readonly<Record<Lang, string>> = { en: 'Glossary', fr: 'Glossaire' };

export function exportFilename(format: ExportFormat, lang: Lang): string {
  return `glossary-${lang}.${EXTENSION[format]}`;
}

/** The glossary as plain text, Markdown or JSON, for printing or saving to use offline. */
export function exportGlossary(format: ExportFormat, lang: Lang): string {
  const terms = listTerms(lang);
  const source = formatProvenance(GLOSSARY_META, lang);
  const sep = lang === 'fr' ? ' :' : ':';
  if (format === 'json') {
    return JSON.stringify(
      {
        lang,
        source: GLOSSARY_META,
        terms: terms.map((t) => ({ id: t.id, term: t.term, plain: t.plain })),
      },
      null,
      2,
    );
  }
  const line = (t: { term: string; plain: string }): string =>
    format === 'markdown' ? `- **${t.term}**${sep} ${t.plain}` : `${t.term}${sep} ${t.plain}`;
  const head = format === 'markdown' ? `# ${TITLE[lang]}` : TITLE[lang];
  const text = [head, '', ...terms.map(line), '', source].join('\n') + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}
