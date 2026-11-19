import { describe, expect, it } from 'vitest';
import {
  EMITTED_TIERS,
  GUIDE_COLUMNS,
  GUIDE_UI,
  OPEN_LICENCES,
  RECORD_COLUMNS,
  REQUIRED_COLUMNS,
  STATUS_VALUES,
  TEMPLATE_EXPORT_ID,
  TEMPLATE_FILENAME,
  auditHtml,
  featureIds,
  featureLine,
  frenchIssues,
  guideText,
  isRequiredColumn,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  recordsFromCsv,
  renderRecordsGuide,
  templateCsv,
  type Lang,
} from './index';

describe('the guide matches the reader', () => {
  it('describes every column, and no others, in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) expect(Object.keys(GUIDE_UI[lang].columns)).toEqual([...GUIDE_COLUMNS]);
    expect(GUIDE_COLUMNS).toEqual([...RECORD_COLUMNS, 'place_kind', 'place_area']);
  });
  it('marks as needed exactly the columns the reader needs', () => {
    expect(RECORD_COLUMNS.filter(isRequiredColumn)).toEqual([...REQUIRED_COLUMNS]);
  });
  it('lists status values the reader takes', () => {
    for (const status of STATUS_VALUES) {
      const back = recordsFromCsv(`${RECORD_COLUMNS.join(',')}\na,A,ramp,${status},,,,,\n`);
      expect(back.rejected, status).toEqual([]);
      expect(back.places[0]?.claims[0]?.status).toBe(status);
    }
  });
  it('lists feature ids the reader takes', () => {
    expect(featureIds().length).toBeGreaterThan(0);
    for (const id of featureIds()) expect(recordsFromCsv(`${RECORD_COLUMNS.join(',')}\na,A,${id},present,,,,,\n`).rejected, id).toEqual([]);
  });
  it('gives an empty table that the reader takes as a table with no places', () => {
    expect(templateCsv()).toBe(`${RECORD_COLUMNS.join(',')}\r\n`);
    const back = recordsFromCsv(templateCsv());
    expect(back.problems).toEqual([]);
    expect(back.places).toEqual([]);
    expect(TEMPLATE_FILENAME).toBe('records-template.csv');
  });
  it('names a feature with its id first', () => {
    expect(featureLine('ramp', 'en')).toBe('ramp (Ramp)');
    expect(featureLine('ramp', 'fr')).toBe('ramp (Rampe)');
  });
});

describe('guide text', () => {
  it('has a line for each column with whether it is needed', () => {
    const text = guideText('en');
    expect(text.startsWith('How to fill in a table of records\n\nUse one row for each record.')).toBe(true);
    expect(text).toContain('- place_id (needed): A short id for the place.');
    expect(text).toContain('- tier (optional): The tier label, if the record has one.');
    for (const c of RECORD_COLUMNS) expect(text).toContain(`- ${c} (`);
  });
  it('lists the feature ids, the open licences and the tiers that can be shown', () => {
    const text = guideText('en');
    expect(text).toContain('- ramp (Ramp)');
    for (const id of OPEN_LICENCES) expect(text).toContain(`- ${id}\n`);
    for (const t of EMITTED_TIERS) expect(text).toContain(`- ${t}\n`);
    expect(text).not.toContain('tier-2');
  });
  it('says what happens to a record with no source', () => {
    expect(guideText('en')).toContain(GUIDE_UI.en.rule);
    expect(guideText('fr')).toContain(GUIDE_UI.fr.rule);
  });
  it('is French', () => {
    expect(guideText('fr')).toContain('- place_name (requis)\u00a0: Le nom du lieu.');
    expect(guideText('fr')).toContain('- ramp (Rampe)');
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderRecordsGuide(lang, true), renderRecordsGuide(lang, false)]) {
      expect(auditHtml(`<div lang="${lang}"><h3>x</h3>${html}</div>`, 'guide')).toEqual([]);
    }
  });
  it('is a closed block with a term and a description for each column', () => {
    const html = renderRecordsGuide('en', false);
    expect(html.startsWith('<details class="gl-guide"><summary>How to fill in a table of records</summary>')).toBe(true);
    expect(html.match(/<dt>/g)).toHaveLength(GUIDE_COLUMNS.length);
    expect(html).toContain('<dt><code>place_kind</code> <span class="gl-note">(optional)</span></dt>');
    expect(html).toContain('<li>library (Library)</li>');
    expect(html).toContain('<dt><code>place_id</code> <span class="gl-note">(needed)</span></dt>');
    expect(html).toContain('<dt><code>url</code> <span class="gl-note">(optional)</span></dt>');
  });
  it('has the button for an empty table only with a host that takes files', () => {
    expect(renderRecordsGuide('en', true)).toContain(`id="${TEMPLATE_EXPORT_ID}"`);
    expect(renderRecordsGuide('en', false)).not.toContain(TEMPLATE_EXPORT_ID);
  });
  it('offers open licences only', () => {
    const html = renderRecordsGuide('en', false);
    for (const id of OPEN_LICENCES) expect(html).toContain(`<li>${id}</li>`);
    expect(html).not.toMatch(/Proprietary|NonCommercial/);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes the rules in %s', (lang) => {
    const ui = GUIDE_UI[lang];
    const texts = [ui.heading, ui.intro, ui.needed, ui.optional, ...Object.values(ui.columns), ui.features, ui.licences, ui.tiers, ui.rule, ui.exportTemplate, ui.title];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
