import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  CONTACTFORM_IDS,
  CONTACTFORM_UI,
  CONTACT_DRAFT_FIELDS,
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  CONTACT_UI,
  EMPTY_CONTACT_DRAFT,
  MAX_ADDRESS_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_WEBSITE_LENGTH,
  OPEN_LICENCES,
  anyContact,
  auditHtml,
  cleanContactDraft,
  contactDraftProblems,
  contactFieldOf,
  contactFieldOk,
  contactCoverage,
  contactFromDraft,
  contactIsUsable,
  contactKey,
  contactLines,
  contactMessage,
  contactPartText,
  contactText,
  draftFromContact,
  effectiveContact,
  frenchIssues,
  isAddress,
  isEmail,
  isPhone,
  isWebsite,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  removePlaceContact,
  renderContact,
  reachSheet,
  renderContactCoverage,
  renderContactForm,
  renderSheetButton,
  sheetFilename,
  renderReach,
  setPlaceContact,
  tidyContact,
  undoLabel,
  withContact,
  type ContactDraft,
  type ContactProblem,
  type Lang,
  type Place,
  type PlaceContact,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const full: PlaceContact = { address: '1 Main Street, Riverside', phone: '416 555 0100', website: 'https://library.example.org/visit', email: 'info@library.example.org', provenance: city };
const lib: Place = { id: 'lib', name: 'Library', claims: [], contact: full };
const bare: Place = { id: 'cafe', name: 'Café <b>', claims: [] };
const good: ContactDraft = { address: '1 Main Street, Riverside', phone: '416 555 0100', website: 'https://library.example.org/visit', email: 'info@library.example.org', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const draft = (o: Partial<ContactDraft> = {}): ContactDraft => ({ ...good, ...o });

describe('what counts as a phone number', () => {
  it('takes 7 to 15 digits with the usual marks between them', () => {
    for (const value of ['416 555 0100', '416-555-0100', '(416) 555-0100', '+1 416 555 0100', '4165550100', '1.416.555.0100', '+44 20 7946 0958', '555 0100']) expect(isPhone(value), value).toBe(true);
  });
  it('takes an extension', () => {
    for (const value of ['416 555 0100 x12', '416 555 0100 ext 12', '416 555 0100 ext. 123456', '416 555 0100x7']) expect(isPhone(value), value).toBe(true);
  });
  it('refuses too few or too many digits, letters, two numbers, and anything too long', () => {
    for (const value of ['', '555', '12345', '1234567890123456', '1-800-FLOWERS', '416 555 0100; 416 555 0101', '416 555 0100 / 0101', 'call us', '+', '416 555 0100 ext', '(416) 555-0100 ' + '1'.repeat(MAX_PHONE_LENGTH)]) {
      expect(isPhone(value), value).toBe(false);
    }
  });
});

describe('what counts as a website and an email', () => {
  it('takes a full address that starts with https', () => {
    for (const value of ['https://example.org', 'https://library.example.org/visit?x=1#top', 'https://example.org:8443/a', 'https://EXAMPLE.org/']) expect(isWebsite(value), value).toBe(true);
  });
  it('refuses anything else, and never repairs it', () => {
    for (const value of ['', 'example.org', 'www.example.org', 'http://example.org', 'ftp://example.org', 'https://', 'https://localhost', 'https://example.org/a b', 'https://example.org/"x"', "https://example.org/'x'", 'https://example.org/<x>', 'javascript:alert(1)', 'https://example.org;https://other.org'.replace(';', ' '), `https://example.org/${'a'.repeat(MAX_WEBSITE_LENGTH)}`]) {
      expect(isWebsite(value), value).toBe(false);
    }
  });
  it('takes a plain email address', () => {
    for (const value of ['info@example.org', 'first.last+tag@sub.example.co']) expect(isEmail(value), value).toBe(true);
    for (const value of ['', 'info', 'info@', '@example.org', 'info@example', 'a b@example.org', 'info@example.org, other@example.org', 'mailto:info@example.org', '<info@example.org>', `${'a'.repeat(MAX_EMAIL_LENGTH)}@example.org`]) expect(isEmail(value), value).toBe(false);
  });
  it('takes an address up to the limit', () => {
    expect(isAddress('1 Main Street')).toBe(true);
    expect(isAddress('x'.repeat(MAX_ADDRESS_LENGTH))).toBe(true);
    expect(isAddress('x'.repeat(MAX_ADDRESS_LENGTH + 1))).toBe(false);
    expect(isAddress('')).toBe(false);
  });
  it('checks each part by its own rule, and an empty part is never well formed', () => {
    expect(contactFieldOk('phone', '416 555 0100')).toBe(true);
    expect(contactFieldOk('phone', 'https://example.org')).toBe(false);
    expect(contactFieldOk('website', 'https://example.org')).toBe(true);
    for (const field of CONTACT_FIELDS) expect(contactFieldOk(field, ''), field).toBe(false);
    expect(Object.keys(CONTACT_LIMITS)).toEqual([...CONTACT_FIELDS]);
  });
});

describe('keeping contact details', () => {
  it('tidies spaces, leaves empty parts out, and keeps values as written', () => {
    expect(tidyContact({ address: '  1  Main   Street ', phone: ' ', website: 'example.org', provenance: city })).toEqual({ address: '1 Main Street', website: 'example.org', provenance: city });
    expect(tidyContact({ phone: '416 555 0100' })).toEqual({ phone: '416 555 0100' });
  });
  it('is nothing when it holds nothing', () => {
    expect(tidyContact(undefined)).toBeUndefined();
    expect(tidyContact({})).toBeUndefined();
    expect(tidyContact({ address: ' ', provenance: city })).toBeUndefined();
  });
  it('has one key for the same details and source, whatever the spacing', () => {
    expect(contactKey(full)).toBe(contactKey({ ...full, address: ' 1 Main  Street, Riverside ' }));
    expect(contactKey(full)).not.toBe(contactKey({ ...full, phone: '416 555 0101' }));
    expect(contactKey(full)).not.toBe(contactKey({ ...full, provenance: { ...city, date: '2026-10-02' } }));
    expect(contactKey(full)).not.toBe(contactKey({ address: full.address as string }));
    expect(contactKey(undefined)).toBe('');
    expect(contactKey({})).toBe('');
  });
  it('sets and removes the contact of a place without changing the place given', () => {
    const before = JSON.stringify(bare);
    expect(withContact(bare, full)).toEqual({ ...bare, contact: full });
    expect('contact' in withContact(lib, undefined)).toBe(false);
    expect('contact' in withContact(lib, { address: ' ' })).toBe(false);
    expect(JSON.stringify(bare)).toBe(before);
    expect(anyContact([bare, lib])).toBe(true);
    expect(anyContact([bare])).toBe(false);
  });
});

describe('what may be shown', () => {
  it('shows every well formed part when the source can be used', () => {
    expect(effectiveContact(lib)).toEqual({ address: full.address, phone: full.phone, website: full.website, email: full.email, provenance: city });
    expect(contactIsUsable(full)).toBe(true);
  });
  it('shows nothing without a source, an open licence and a real date', () => {
    const nothing = { address: '', phone: '', website: '', email: '', provenance: null };
    expect(effectiveContact(bare)).toEqual(nothing);
    expect(effectiveContact({ contact: { phone: '416 555 0100' } })).toEqual(nothing);
    expect(effectiveContact({ contact: { ...full, provenance: { ...city, licence: 'Proprietary' } } })).toEqual(nothing);
    expect(effectiveContact({ contact: { ...full, provenance: { ...city, date: '2026-02-30' } } })).toEqual(nothing);
    expect(effectiveContact({ contact: { ...full, provenance: { ...city, source: ' ' } } })).toEqual(nothing);
    expect(contactIsUsable(undefined)).toBe(false);
  });
  it('leaves out a part that is not well formed, and keeps the rest', () => {
    const mixed = effectiveContact({ contact: { ...full, phone: 'call the front desk', website: 'http://library.example.org' } });
    expect(mixed).toEqual({ address: full.address, phone: '', website: '', email: full.email, provenance: city });
  });
  it('shows nothing when no part is well formed', () => {
    expect(effectiveContact({ contact: { phone: 'call us', website: 'example.org', provenance: city } }).provenance).toBeNull();
  });
});

describe('contact details in words', () => {
  it('names each part, with Unknown for a part that cannot be shown', () => {
    expect(contactPartText('phone', '416 555 0100', 'en')).toBe('Phone: 416 555 0100');
    expect(contactPartText('phone', '', 'en')).toBe('Phone: Unknown');
    expect(contactPartText('website', '', 'fr')).toBe('Site Web\u00a0: UNKNOWN');
    expect(contactPartText('website', 'https://example.org/a?b=1', 'fr')).toBe('Site Web\u00a0: https://example.org/a?b=1');
  });
  it('gives every part on its own line, then the source', () => {
    expect(contactLines(lib, 'en')).toEqual(['Address: 1 Main Street, Riverside', 'Phone: 416 555 0100', 'Website: https://library.example.org/visit', 'Email: info@library.example.org', 'Source: City open data, dated 2026-10-01.']);
    expect(contactLines(bare, 'en')).toEqual(['Address: Unknown', 'Phone: Unknown', 'Website: Unknown', 'Email: Unknown']);
  });
  it('says so when details are held that cannot be shown', () => {
    const held: Place = { ...bare, contact: { phone: '416 555 0100' } };
    expect(contactLines(held, 'en').at(-1)).toBe(CONTACT_UI.en.notUsable);
    expect(contactText(held, 'fr')).toBe(`Adresse\u00a0: UNKNOWN. Téléphone\u00a0: UNKNOWN. Site Web\u00a0: UNKNOWN. Courriel\u00a0: UNKNOWN. ${CONTACT_UI.fr.notUsable}`);
  });
  it('gives one text for the differences between two sets of records', () => {
    expect(contactText(lib, 'en')).toBe('Address: 1 Main Street, Riverside. Phone: 416 555 0100. Website: https://library.example.org/visit. Email: info@library.example.org. Source: City open data, dated 2026-10-01.');
    expect(contactText(bare, 'en')).toBe('Address: Unknown. Phone: Unknown. Website: Unknown. Email: Unknown.');
  });
  it('never respaces a web address in French', () => {
    const text = contactText({ contact: { website: 'https://example.org/a?b=1;c=2', provenance: city } }, 'fr');
    expect(text).toContain('Site Web\u00a0: https://example.org/a?b=1;c=2.');
    expect(text).toContain('Source\u00a0: City open data, date du 2026-10-01.');
  });
});

describe('renderContact', () => {
  it('is nothing for a place that holds no contact details', () => {
    expect(renderContact(bare, 'en')).toBe('');
  });
  it('lists the parts as text, with their source', () => {
    expect(renderContact(lib, 'en')).toBe(
      '<ul class="gl-contact" aria-label="How to reach Library"><li data-contact="address">Address: <span class="gl-contact-value">1 Main Street, Riverside</span></li>' +
        '<li data-contact="phone">Phone: <span class="gl-contact-value">416 555 0100</span></li>' +
        '<li data-contact="website">Website: <span class="gl-contact-value">https://library.example.org/visit</span></li>' +
        '<li data-contact="email">Email: <span class="gl-contact-value">info@library.example.org</span></li></ul>' +
        '<p class="gl-note gl-contact-source">Source: City open data, dated 2026-10-01.</p>',
    );
  });
  it('makes no link: these pages do not link to other sites or start a call', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = renderContact(lib, lang) + renderReach(lib, lang);
      expect(html).not.toContain('<a ');
      expect(html).not.toContain('href');
    }
  });
  it('lists only the parts that can be shown', () => {
    const html = renderContact({ name: 'Library', contact: { phone: '416 555 0100', website: 'javascript:alert(1)', email: 'not an email', provenance: city } }, 'en');
    expect(html.match(/<li /g)).toHaveLength(1);
    expect(html).not.toContain('javascript');
    expect(html).not.toContain('not an email');
  });
  it('says so when details are held that cannot be shown', () => {
    expect(renderContact({ name: 'Library', contact: { phone: '416 555 0100' } }, 'en')).toBe(`<p class="gl-note gl-contact-note">${CONTACT_UI.en.notUsable}</p>`);
  });
  it('escapes the name and the address', () => {
    const html = renderContact({ name: 'Café <b>', contact: { address: '1 "Main" <Street>', provenance: city } }, 'en');
    expect(html).toContain('aria-label="How to reach Café &lt;b&gt;"');
    expect(html).toContain('Address: <span class="gl-contact-value">1 &quot;Main&quot; &lt;Street&gt;</span>');
  });
  it('is French', () => {
    const html = renderContact(lib, 'fr');
    expect(html).toContain('aria-label="Comment joindre Library"');
    expect(html).toContain('<li data-contact="phone">Téléphone\u00a0: <span class="gl-contact-value">416 555 0100</span></li>');
    expect(html).toContain('<p class="gl-note gl-contact-source">Source\u00a0: City open data, date du 2026-10-01.</p>');
  });
  it('heads the way to reach a place in the steps of a visit, or says it is unknown', () => {
    expect(renderReach(lib, 'en').startsWith('<h5>How to reach this place</h5><ul class="gl-contact"')).toBe(true);
    expect(renderReach(bare, 'en')).toBe('<h5>How to reach this place</h5><p class="gl-note" data-gl-reach-unknown>Contact details for this place are Unknown.</p>');
    expect(renderReach(bare, 'fr')).toContain('Les coordonnées de ce lieu sont UNKNOWN.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const place of [lib, bare, { ...bare, contact: { phone: 'x' } }]) {
        expect(auditHtml(`<div lang="${lang}"><h3>t</h3><h4>t</h4>${renderReach(place, lang)}${renderContact(place, lang)}</div>`, 'contact'), lang).toEqual([]);
      }
    }
  });
});

describe('how much is known about reaching the places', () => {
  const held: Place = { id: 'hall', name: 'Hall', claims: [], contact: { phone: 'call us', email: 'hall@example.org', provenance: city } };
  const unsourced: Place = { id: 'pool', name: 'Pool', claims: [], contact: { phone: '416 555 0100' } };
  const places = [lib, bare, held, unsourced];
  it('counts, for each detail, the places that show it and the places where it is unknown', () => {
    expect(contactCoverage(places)).toEqual([
      { field: 'address', shown: 1, unknown: 3 },
      { field: 'phone', shown: 1, unknown: 3 },
      { field: 'website', shown: 1, unknown: 3 },
      { field: 'email', shown: 2, unknown: 2 },
    ]);
    expect(contactCoverage([])).toEqual(CONTACT_FIELDS.map((field) => ({ field, shown: 0, unknown: 0 })));
  });
  it('is a small table with headers', () => {
    const html = renderContactCoverage(places, 'en');
    expect(html).toContain('<caption>Contact details that can be shown, place by place</caption><thead><tr><th scope="col">Detail</th><th scope="col">Places where it is shown</th><th scope="col">Places where it is Unknown</th></tr></thead>');
    expect(html).toContain('<tr data-contact="email"><th scope="row">Email</th><td>2</td><td>2</td></tr>');
    expect(html.match(/<tr data-contact=/g)).toHaveLength(4);
  });
  it('says so when no place holds contact details', () => {
    expect(renderContactCoverage([bare], 'en')).toBe('<p class="gl-note" data-gl-contact-none>No place has contact details yet.</p>');
    expect(renderContactCoverage([], 'fr')).toContain('Aucun lieu n’a encore de coordonnées.');
  });
  it('is French with the token, and passes the HTML audit in both languages', () => {
    expect(renderContactCoverage(places, 'fr')).toContain('<th scope="col">Lieux où elle est UNKNOWN</th>');
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${renderContactCoverage(places, lang)}${renderContactCoverage([], lang)}${renderSheetButton(lang)}</div>`, 'coverage'), lang).toEqual([]);
    }
  });
});

describe('a sheet of questions for a place', () => {
  const questions = ['Is there a ramp? How long is it?', 'How wide is the clear opening of the door?'];
  it('gives how to reach the place, then each question with room for the answer', () => {
    expect(reachSheet(lib, questions, 'en', today)).toBe(
      'Questions to ask Library\nMade on 2026-11-19 from the loaded records.\n\nHow to reach this place\n- Address: 1 Main Street, Riverside\n- Phone: 416 555 0100\n- Website: https://library.example.org/visit\n- Email: info@library.example.org\n- Source: City open data, dated 2026-10-01.\n\n' +
        'Questions about what the records do not say\n1. Is there a ramp? How long is it?\n   Answer:\n\n2. How wide is the clear opening of the door?\n   Answer:\n',
    );
  });
  it('says Unknown for a place with no contact details, and still lists the questions', () => {
    const text = reachSheet(bare, questions.slice(0, 1), 'en', today);
    expect(text).toContain('How to reach this place\n- Address: Unknown\n- Phone: Unknown\n- Website: Unknown\n- Email: Unknown\n\nQuestions about what the records do not say\n1. Is there a ramp?');
    expect(text.startsWith('Questions to ask Café <b>\n')).toBe(true);
  });
  it('says so when the records leave no question open', () => {
    expect(reachSheet(lib, [], 'en', today).endsWith('Questions about what the records do not say\nThe records leave no question open for this visit.\n')).toBe(true);
  });
  it('is French with the token and French spacing in its own words', () => {
    const text = reachSheet(bare, ['Y a-t-il une rampe\u202f?'], 'fr', today);
    expect(text).toContain('Questions à poser à Café <b>\nCréé le 2026-11-19 à partir des fiches chargées.\n\nComment joindre ce lieu\n- Adresse\u00a0: UNKNOWN\n');
    expect(text).toContain('1. Y a-t-il une rampe\u202f?\n   Réponse\u00a0:\n');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('has a button and a file name for each language', () => {
    expect(renderSheetButton('en')).toBe('<div class="gl-actions"><button type="button" class="gl-btn" id="gl-reach-sheet">Save a sheet of questions for this place</button></div>');
    expect(renderSheetButton('fr')).toContain('Enregistrer une feuille de questions pour ce lieu');
    expect(sheetFilename('en')).toBe('questions-for-a-place-en.txt');
    expect(sheetFilename('fr')).toBe('questions-for-a-place-fr.txt');
  });
});

describe('contactDraftProblems', () => {
  const problems = (o: Partial<ContactDraft>): readonly ContactProblem[] => contactDraftProblems(draft(o), today);
  it('accepts any one detail with a source, an open licence and a real date', () => {
    expect(problems({})).toEqual([]);
    expect(problems({ tier: '' })).toEqual([]);
    expect(problems({ address: '', website: '', email: '' })).toEqual([]);
    expect(problems({ address: '', phone: '', website: '' })).toEqual([]);
    for (const licence of OPEN_LICENCES) expect(problems({ licence })).toEqual([]);
  });
  it('wants at least one detail', () => {
    expect(problems({ address: ' ', phone: '', website: '', email: '' })).toEqual(['nothing-given']);
  });
  it('wants each detail well formed, and does not repair it', () => {
    expect(problems({ address: 'x'.repeat(MAX_ADDRESS_LENGTH + 1) })).toEqual(['address-too-long']);
    expect(problems({ phone: '555' })).toEqual(['phone-invalid']);
    expect(problems({ website: 'library.example.org' })).toEqual(['website-invalid']);
    expect(problems({ website: 'http://library.example.org' })).toEqual(['website-invalid']);
    expect(problems({ email: 'info at example.org' })).toEqual(['email-invalid']);
  });
  it('wants a source, an open licence, a real date up to today, and a tier that may be shown', () => {
    expect(problems({ source: '' })).toEqual(['source-missing']);
    expect(problems({ source: 'x'.repeat(200) })).toEqual(['source-too-long']);
    expect(problems({ licence: 'Proprietary' })).toEqual(['licence-not-open']);
    expect(problems({ date: 'soon' })).toEqual(['date-invalid']);
    expect(problems({ date: '2026-11-20' })).toEqual(['date-in-future']);
    expect(problems({ tier: 'gold' })).toEqual(['tier-not-known']);
  });
  it('lists every problem at once, in the order of the form', () => {
    expect(contactDraftProblems(EMPTY_CONTACT_DRAFT, today)).toEqual(['nothing-given', 'source-missing', 'licence-not-open', 'date-invalid']);
    expect(contactDraftProblems(draft({ phone: 'x', website: 'y', email: 'z', date: '' }), today)).toEqual(['phone-invalid', 'website-invalid', 'email-invalid', 'date-invalid']);
  });
  it('knows which box each problem belongs to, and has words for each', () => {
    const all: ContactProblem[] = ['nothing-given', 'address-too-long', 'phone-invalid', 'website-invalid', 'email-invalid', 'source-missing', 'source-too-long', 'licence-not-open', 'date-invalid', 'date-in-future', 'tier-not-known'];
    expect(all.map(contactFieldOf)).toEqual(['address', 'address', 'phone', 'website', 'email', 'source', 'source', 'licence', 'date', 'date', 'tier']);
    for (const lang of ['en', 'fr'] as const) expect(Object.keys(CONTACTFORM_UI[lang].problems).sort()).toEqual([...all].sort());
  });
});

describe('drafts', () => {
  it('tidies spaces', () => {
    expect(cleanContactDraft(draft({ address: ' 1  Main Street ', website: ' https://example.org ', source: ' City  open data ' }))).toEqual(draft({ address: '1 Main Street', website: 'https://example.org' }));
  });
  it('makes the contact a valid draft stands for, and it may be shown', () => {
    expect(contactFromDraft(good)).toEqual(full);
    expect(contactFromDraft(draft({ address: '', website: '', email: '', tier: '' }))).toEqual({ phone: '416 555 0100', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' } });
    expect(effectiveContact({ contact: contactFromDraft(good) }).provenance).toEqual(city);
  });
  it('shows what a place holds now, and round-trips', () => {
    expect(draftFromContact(undefined)).toEqual(EMPTY_CONTACT_DRAFT);
    expect(draftFromContact(full)).toEqual(good);
    expect(draftFromContact({ phone: '416 555 0100' })).toEqual({ ...EMPTY_CONTACT_DRAFT, phone: '416 555 0100' });
    expect(contactFromDraft(draftFromContact(full))).toEqual(full);
    expect(Object.keys(EMPTY_CONTACT_DRAFT)).toEqual([...CONTACT_DRAFT_FIELDS]);
  });
});

describe('setPlaceContact and removePlaceContact', () => {
  const places = [lib, bare];
  it('sets the contact of one place and leaves the others as they are', () => {
    const result = setPlaceContact(places, 1, good, today);
    expect(result.outcome).toBe('saved');
    expect(result.places[1]).toEqual({ ...bare, contact: full });
    expect(result.places[0]).toBe(lib);
  });
  it('says so when the place already has these details', () => {
    const result = setPlaceContact(places, 0, draft({ address: ' 1 Main Street,  Riverside ' }), today);
    expect(result.outcome).toBe('same');
    expect(result.places).toBe(places);
  });
  it('saves nothing for a draft with a problem, or when no place is chosen', () => {
    const invalid = setPlaceContact(places, 1, draft({ phone: '555' }), today);
    expect(invalid).toEqual({ outcome: 'invalid', places, problems: ['phone-invalid'] });
    for (const index of [-1, 2, 0.5, Number.NaN]) expect(setPlaceContact(places, index, good, today).outcome, String(index)).toBe('missing');
  });
  it('takes the contact away and keeps the rest of the place', () => {
    const result = removePlaceContact([{ ...lib, info: { kind: 'library', provenance: city } }, bare], 0);
    expect(result.outcome).toBe('removed');
    expect(result.places[0]).toEqual({ id: 'lib', name: 'Library', claims: [], info: { kind: 'library', provenance: city } });
    expect(removePlaceContact(places, 1).outcome).toBe('nothing-to-remove');
    expect(removePlaceContact(places, 9).outcome).toBe('missing');
  });
  it('does not change the places it was given', () => {
    const before = JSON.stringify(places);
    setPlaceContact(places, 1, good, today);
    removePlaceContact(places, 0);
    expect(JSON.stringify(places)).toBe(before);
  });
  it('says what happened', () => {
    expect(contactMessage(setPlaceContact(places, 1, good, today), 'Café', 'en')).toBe('Saved how to reach Café.');
    expect(contactMessage(setPlaceContact(places, 0, good, today), 'x', 'en')).toBe('The place already has these contact details.');
    expect(contactMessage(removePlaceContact(places, 0), 'Library', 'fr')).toBe('Coordonnées retirées pour Library.');
    expect(contactMessage(removePlaceContact(places, 1), 'x', 'en')).toBe('This place has no contact details to remove.');
    expect(contactMessage(setPlaceContact(places, 9, good, today), 'x', 'en')).toBe('Choose a place to reach first.');
    expect(contactMessage(setPlaceContact(places, 1, EMPTY_CONTACT_DRAFT, today), 'x', 'en')).toBe('');
    expect(undoLabel('contact', 'en')).toBe('Undo: contact details');
    expect(undoLabel('contact', 'fr')).toBe('Annuler\u00a0: coordonnées');
  });
});

describe('renderContactForm', () => {
  const places = [lib, bare];
  const form = (o: Partial<Parameters<typeof renderContactForm>[0]> = {}): string => renderContactForm({ lang: 'en', places, placeIndex: null, draft: EMPTY_CONTACT_DRAFT, ...o });
  it('asks for a place first when there are none', () => {
    const html = form({ places: [] });
    expect(html).toContain('<h4>Set how to reach a place</h4>');
    expect(html).toContain('Add a place before you set how to reach it.');
    expect(html).not.toContain('<fieldset');
  });
  it('has a labelled control for the place and for each field, with the right kind of keyboard', () => {
    const html = form();
    for (const field of CONTACT_DRAFT_FIELDS) expect(html, field).toContain(`<label for="${CONTACTFORM_IDS[field]}">`);
    expect(html.match(/<label /g)).toHaveLength(CONTACT_DRAFT_FIELDS.length + 1);
    expect(html).toContain(`<input type="tel" id="${CONTACTFORM_IDS.phone}" class="gl-input" maxlength="${MAX_PHONE_LENGTH * 2}" autocomplete="off" inputmode="tel" value="">`);
    expect(html).toContain(`<input type="url" id="${CONTACTFORM_IDS.website}"`);
    expect(html).toContain(`<input type="email" id="${CONTACTFORM_IDS.email}"`);
    expect(html).toContain('<option value="0">Library</option><option value="1">Café &lt;b&gt;</option>');
    expect(html).toContain(`id="${CONTACTFORM_IDS.save}">Save the contact details</button>`);
  });
  it('shows the draft in its boxes, escaped, and offers to remove only when the place holds details', () => {
    const html = form({ placeIndex: 0, draft: draft({ address: '1 "Main" <Street>' }) });
    expect(html).toContain('<option value="0" selected>Library</option>');
    expect(html).toContain('value="1 &quot;Main&quot; &lt;Street&gt;"');
    expect(html).toContain('value="https://library.example.org/visit"');
    expect(html).toContain('<option value="CC0-1.0" selected>');
    expect(html).toContain(`id="${CONTACTFORM_IDS.remove}">Remove the contact details</button>`);
    expect(form({ placeIndex: 1 })).not.toContain(CONTACTFORM_IDS.remove);
    expect(form({ placeIndex: 7 })).toContain('<option value="" selected>Choose a place</option>');
  });
  it('lists what to fix as an alert and marks the boxes', () => {
    const html = form({ placeIndex: 1, draft: draft({ phone: '555', website: 'x' }), problems: ['phone-invalid', 'website-invalid'] });
    expect(html).toContain('<div id="gl-pc-errors" role="alert"><p>There are 2 things to fix before this can be saved.</p><ul><li>Give the phone number with 7 to 15 digits, such as 416 555 0100.</li><li>Give the website as a full address that starts with https.</li></ul></div>');
    expect(html.match(/aria-invalid="true" aria-describedby="gl-pc-errors"/g)).toHaveLength(2);
    expect(html).not.toContain('data-gl-pc-msg');
  });
  it('shows the message when there is nothing to fix', () => {
    expect(form({ message: 'Saved how to reach <x>.' })).toContain('<p role="status" data-gl-pc-msg>Saved how to reach &lt;x&gt;.</p>');
  });
  it('is French, and passes the HTML audit in both languages', () => {
    const html = form({ lang: 'fr', placeIndex: 0, problems: ['nothing-given'] });
    expect(html).toContain('<h4>Indiquer comment joindre un lieu</h4>');
    expect(html).toContain('Donnez une adresse, un numéro de téléphone, un site Web ou un courriel.');
    expect(html).toContain('>Retirer les coordonnées</button>');
    for (const lang of ['en', 'fr'] as const) {
      for (const problems of [[], ['email-invalid', 'date-in-future']] as ContactProblem[][]) {
        expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${form({ lang, placeIndex: 0, draft: good, problems, message: 'm' })}</div>`, 'contact-form'), lang).toEqual([]);
      }
    }
  });
});

describe('the words', () => {
  const texts = (lang: Lang): string[] => {
    const ui = CONTACT_UI[lang];
    const form = CONTACTFORM_UI[lang];
    return [
      ...Object.values(ui.names), ui.part('Phone', '416 555 0100'), ui.from('City open data', '2026-10-01'), ui.notUsable, ui.listLabel('Library'), ui.reachHeading, ui.unknownAll, ui.coverageCaption, ui.colDetail, ui.colShown, ui.colUnknown, ui.coverageNone, ui.sheetTitle('Library'), ui.sheetMadeOn('2026-11-19'), ui.sheetQuestions, ui.sheetNoQuestions, ui.sheetAnswer, ui.sheetSave,
      form.heading, form.intro, form.legend, form.place, form.choosePlace, form.address, form.phone, form.website, form.email, form.source, form.licence, form.chooseLicence, form.date, form.tier, form.noTier, form.save, form.remove,
      form.noPlaces, form.pickFirst, form.invalid(1), form.invalid(3), ...Object.values(form.problems), form.saved('Library'), form.same, form.removed('Library'), form.nothingToRemove,
    ];
  };
  it('have the same keys in both languages, at every level', () => {
    const keys = (x: object): string[] => Object.entries(x).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v).map((s) => `${k}.${s}`) : [k]));
    expect(keys(CONTACT_UI.fr)).toEqual(keys(CONTACT_UI.en));
    expect(keys(CONTACTFORM_UI.fr)).toEqual(keys(CONTACTFORM_UI.en));
  });
  it('pass the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'contact'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});
