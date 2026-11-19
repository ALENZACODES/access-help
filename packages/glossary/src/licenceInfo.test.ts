import { describe, expect, it } from 'vitest';
import {
  LICENCE_FACTS,
  LICENCE_UI,
  OPEN_LICENCES,
  auditHtml,
  creditLine,
  frenchIssues,
  knownLicences,
  licenceDuties,
  licenceFacts,
  licenceLabel,
  lintClaims,
  lintCopy,
  needsCredit,
  plainLanguageIssues,
  readabilityIssues,
  renderLicenceDuties,
  type Lang,
} from './index';

describe('facts', () => {
  it('has facts for every licence we accept, and no others', () => {
    expect(Object.keys(LICENCE_FACTS).sort()).toEqual([...OPEN_LICENCES].sort());
    expect(knownLicences()).toBe(OPEN_LICENCES);
    for (const id of OPEN_LICENCES) expect(LICENCE_FACTS[id].name.trim()).not.toBe('');
  });
  it('has a different name for each licence', () => {
    const names = OPEN_LICENCES.map((id) => LICENCE_FACTS[id].name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('asks for credit where the licence does', () => {
    for (const id of ['CC-BY-4.0', 'CC-BY-SA-4.0', 'ODbL-1.0', 'ODC-By-1.0', 'OGL-Canada-2.0', 'OGL-UK-3.0']) expect(needsCredit(id), id).toBe(true);
    for (const id of ['CC0-1.0', 'PDDL-1.0']) expect(needsCredit(id), id).toBe(false);
  });
  it('asks for the same licence only for share-alike licences', () => {
    const same = OPEN_LICENCES.filter((id) => LICENCE_FACTS[id].sameLicence);
    expect(same).toEqual(['CC-BY-SA-4.0', 'ODbL-1.0']);
  });
  it('asks to keep the notice for the software licences', () => {
    const keep = OPEN_LICENCES.filter((id) => LICENCE_FACTS[id].keepNotice);
    expect(keep).toEqual(['MIT', 'Apache-2.0', 'BSD-3-Clause']);
  });
  it('is null for a licence we do not accept, and treats it as needing credit', () => {
    for (const bad of ['', 'Proprietary', 'cc0-1.0', 'CC-BY-NC-4.0', 'constructor', '__proto__']) {
      expect(licenceFacts(bad), bad).toBeNull();
      expect(needsCredit(bad), bad).toBe(true);
    }
  });
});

describe('duties', () => {
  it('lists what a licence asks, in a fixed order', () => {
    expect(licenceDuties('CC-BY-SA-4.0', 'en')).toEqual([LICENCE_UI.en.credit, LICENCE_UI.en.sameLicence]);
    expect(licenceDuties('MIT', 'en')).toEqual([LICENCE_UI.en.keepNotice]);
    expect(licenceDuties('OGL-Canada-2.0', 'fr')).toEqual([LICENCE_UI.fr.credit]);
  });
  it('says there are no conditions for a public-domain dedication', () => {
    expect(licenceDuties('CC0-1.0', 'en')).toEqual([LICENCE_UI.en.free]);
    expect(licenceDuties('PDDL-1.0', 'fr')).toEqual([LICENCE_UI.fr.free]);
  });
  it('warns for a licence we do not accept', () => {
    expect(licenceDuties('Proprietary', 'en')).toEqual([LICENCE_UI.en.notOpen]);
  });
  it('always says something', () => {
    for (const id of OPEN_LICENCES) for (const lang of ['en', 'fr'] as Lang[]) expect(licenceDuties(id, lang).length).toBeGreaterThan(0);
  });
});

describe('labels and credits', () => {
  it('gives the id with the full name', () => {
    expect(licenceLabel('CC-BY-4.0')).toBe('CC-BY-4.0 (Creative Commons Attribution 4.0)');
    expect(licenceLabel('Other')).toBe('Other');
  });
  it('writes a credit with the source, the date and the licence', () => {
    expect(creditLine({ source: 'City open data', licence: 'OGL-Canada-2.0', date: '2026-10-01' }, 'en')).toBe(
      'Contains information from City open data, dated 2026-10-01. Licence: OGL-Canada-2.0 (Open Government Licence – Canada 2.0).',
    );
  });
  it('writes a French credit with its spacing', () => {
    expect(creditLine({ source: 'Ville', licence: 'CC0-1.0', date: '2026-10-01' }, 'fr')).toBe(
      'Contient de l’information de Ville, datée du 2026-10-01. Licence\u00a0: CC0-1.0 (Creative Commons Zero 1.0).',
    );
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${renderLicenceDuties([...OPEN_LICENCES, 'Other'], lang)}</div>`, 'lic')).toEqual([]);
  });
  it('lists each licence once with what it asks, and the note', () => {
    const html = renderLicenceDuties(['CC-BY-4.0', 'CC0-1.0', 'CC-BY-4.0'], 'en');
    expect(html.match(/<dt>/g)).toHaveLength(2);
    expect(html).toContain('<dt>CC-BY-4.0 (Creative Commons Attribution 4.0)</dt><dd>Say where the data came from.</dd>');
    expect(html).toContain('<dd>No conditions for sharing.</dd>');
    expect(html).toContain(LICENCE_UI.en.note);
  });
  it('is empty with no licences', () => {
    expect(renderLicenceDuties([], 'en')).toBe('');
  });
  it('escapes ids', () => {
    expect(renderLicenceDuties(['<b>x</b>'], 'en')).not.toContain('<b>x');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = LICENCE_UI[lang];
    const texts = [ui.heading, ui.note, ui.credit, ui.sameLicence, ui.keepNotice, ui.free, ui.notOpen, ui.credits('City open data', '2026-10-01'), ui.under('CC0-1.0')];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
