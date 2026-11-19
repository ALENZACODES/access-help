import { describe, expect, it } from 'vitest';
import { ALSO_A_WORD, comparableTerms, otherLanguageTerms } from './index';
import { TERMS as CATALOGUE, type Term } from './terms';

const term = (id: string, en: string, fr: string): Term => ({ id, en, fr, role: 'noun', note: 'A note.', noteFr: 'Une note.' });
const found = (text: string, lang: 'en' | 'fr', terms?: readonly Term[]): string[] => otherLanguageTerms(text, lang, terms).map((t) => `${t.termId}:${t.found}>${t.use}`);

describe('otherLanguageTerms: French text', () => {
  it('finds the English word of a term and gives the French word', () => {
    expect(found('Le washroom est au rez-de-chaussée.', 'fr')).toEqual(['washroom:washroom>Toilettes']);
    expect(found('Voir l’elevator et la ramp.', 'fr')).toEqual(['elevator:elevator>Ascenseur', 'ramp:ramp>Rampe']);
  });
  it('matches without regard to case, and keeps the word as written', () => {
    expect(found('WASHROOM fermé', 'fr')).toEqual(['washroom:WASHROOM>Toilettes']);
  });
  it('matches whole words only', () => {
    expect(found('Les ramps et le washroomette.', 'fr')).toEqual([]);
    expect(found('Un pre-washroom.', 'fr')).toEqual([]);
  });
  it('prefers the longer label when one label is inside another', () => {
    expect(found('Le accessible parking est derrière.', 'fr')).toEqual(['accessible-parking:accessible parking>Stationnement accessible']);
    expect(found('Le parking est derrière.', 'fr')).toEqual(['parking:parking>Stationnement']);
  });
  it('finds a label of several words across a non-breaking space', () => {
    expect(found('Dernier état\u00a0: last\u00a0checked hier.', 'fr')).toEqual(['last-checked:last\u00a0checked>Dernier contrôle']);
  });
  it('leaves alone English labels that are also French words', () => {
    for (const word of ALSO_A_WORD.fr) expect(found(`Voici ${word} ici.`, 'fr'), word).toEqual([]);
    expect(found('La route vers le service, avec la date et la source.', 'fr')).toEqual([]);
  });
  it('gives each term once, in the order of the text', () => {
    expect(found('ramp, elevator, ramp, Ramp', 'fr')).toEqual(['ramp:ramp>Rampe', 'elevator:elevator>Ascenseur']);
  });
  it('finds nothing in French that uses the App’s French words', () => {
    expect(found('Les toilettes, l’ascenseur et la rampe sont signalés par une source.', 'fr')).toEqual([]);
    expect(found('', 'fr')).toEqual([]);
  });
});

describe('otherLanguageTerms: English text', () => {
  it('finds the French word of a term and gives the English word', () => {
    expect(found('The ascenseur is near the toilettes.', 'en')).toEqual(['elevator:ascenseur>Elevator', 'washroom:toilettes>Washroom']);
    expect(found('Stationnement accessible is behind the hall.', 'en')).toEqual(['accessible-parking:Stationnement accessible>Accessible parking']);
  });
  it('wants the accents: a French word typed without them is another word', () => {
    expect(found('See the Repertoire.', 'en')).toEqual([]);
    expect(found('See the Répertoire.', 'en')).toEqual(['directory:Répertoire>Directory']);
  });
  it('leaves alone French labels that are also English words', () => {
    for (const word of ALSO_A_WORD.en) expect(found(`Here is ${word} now.`, 'en'), word).toEqual([]);
  });
  it('finds nothing in English that uses the App’s English words', () => {
    expect(found('The washroom, the elevator and the ramp are reported by one source.', 'en')).toEqual([]);
  });
});

describe('otherLanguageTerms: what is never compared', () => {
  it('skips a term whose label is the same in both languages', () => {
    expect(found('Source and Licence', 'fr', [term('source', 'Source', 'Source'), term('licence', 'Licence', 'Licence')])).toEqual([]);
  });
  it('skips data labels, which are the same token in both languages', () => {
    expect(found('PROTOTYPE-UNVERIFIED et SEEDED-OPEN-DATA', 'fr')).toEqual([]);
    expect(found('PROTOTYPE-UNVERIFIED and SEEDED-OPEN-DATA', 'en')).toEqual([]);
  });
  it('skips a word that is another term’s label in the language of the text', () => {
    const terms = [term('a', 'Table', 'Tableau'), term('b', 'Board', 'Table')];
    expect(found('La table est ici.', 'fr', terms)).toEqual([]);
    expect(found('La board est ici.', 'fr', terms)).toEqual(['b:board>Table']);
  });
  it('drops the article of a label before matching', () => {
    const terms = [term('app', 'the App', 'l’application')];
    expect(found('Ouvrez app.', 'fr', terms)).toEqual(['app:app>application']);
    expect(found('Open the application.', 'en', terms)).toEqual(['app:application>App']);
  });
  it('treats special characters in a label as plain text', () => {
    const terms = [term('x', 'C++ (new)', 'Nouveau')];
    expect(found('Voici C++ (new) ici.', 'fr', terms)).toEqual(['x:C++ (new)>Nouveau']);
    expect(found('Voici C (new) ici.', 'fr', terms)).toEqual([]);
  });
});

describe('comparableTerms', () => {
  it('lists the terms that can be told apart by language', () => {
    const fr = comparableTerms('fr');
    expect(fr).toContain('washroom');
    expect(fr).toContain('elevator');
    expect(fr).not.toContain('source');
    expect(fr).not.toContain('route');
    expect(fr).not.toContain('prototype-label');
  });
  it('covers most of the catalogue in both directions', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(comparableTerms(lang).length).toBeGreaterThan(CATALOGUE.length / 2);
      expect(comparableTerms(lang).length).toBeLessThan(CATALOGUE.length);
    }
  });
  it('finds each comparable term from its other-language label', () => {
    for (const id of comparableTerms('fr')) {
      const t = CATALOGUE.find((x) => x.id === id) as Term;
      expect(otherLanguageTerms(`Voici ${t.en.replace(/^the /i, '')} ici.`, 'fr').map((x) => x.termId), id).toContain(id);
    }
    for (const id of comparableTerms('en')) {
      const t = CATALOGUE.find((x) => x.id === id) as Term;
      expect(otherLanguageTerms(`Here is ${t.fr.replace(/^l[’']/i, '')} now.`, 'en').map((x) => x.termId), id).toContain(id);
    }
  });
  it('keeps the list of ordinary words short and in lower case', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(ALSO_A_WORD[lang].length).toBeLessThan(12);
      for (const w of ALSO_A_WORD[lang]) expect(w).toBe(w.toLowerCase());
    }
  });
});
