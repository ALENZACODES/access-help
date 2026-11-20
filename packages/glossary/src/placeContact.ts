import { fixFrench } from './frTypography';
import { licenceLabel } from './licenceInfo';
import { unknownWord } from './placeInfo';
import type { Place, PlaceContact } from './places';
import type { Lang } from './plainTerms';
import { OPEN_LICENCES, validateProvenance, type Provenance } from './provenance';
import { MAX_SOURCE_NAME } from './recordForm';
import { EMITTED_TIERS, TIER_UI, isTier } from './sourceTier';
import { escapeHtml } from './text';

/**
 * How to reach a place: its address, phone, website and email, as one source gives them. They
 * are shown only with a usable source, an open licence and a real date, and only when each one
 * is well formed. A phone number or a web address that is not well formed is kept as written
 * and not shown. Without a usable source the page shows Unknown.
 */
export const CONTACT_FIELDS = ['address', 'phone', 'website', 'email'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const MAX_ADDRESS_LENGTH = 120;
export const MAX_PHONE_LENGTH = 30;
export const MAX_WEBSITE_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 100;
export const CONTACT_LIMITS: Readonly<Record<ContactField, number>> = { address: MAX_ADDRESS_LENGTH, phone: MAX_PHONE_LENGTH, website: MAX_WEBSITE_LENGTH, email: MAX_EMAIL_LENGTH };

const tidy = (text: string): string => text.replace(/\s+/g, ' ').trim();

const PHONE = /^(\+?\(?[0-9][0-9 ().-]*[0-9])(?: ?(?:x|ext\.?) ?([0-9]{1,6}))?$/i;

/** A phone number: 7 to 15 digits, with spaces, dots, dashes and brackets between them, an optional + in front and an optional extension. */
export function isPhone(value: string): boolean {
  const m = PHONE.exec(value);
  if (m === null || value.length > MAX_PHONE_LENGTH) return false;
  const digits = (m[1] as string).replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** A web address that starts with https, names a host with a dot, and has no spaces, quotes or angle brackets. */
export function isWebsite(value: string): boolean {
  return value.length <= MAX_WEBSITE_LENGTH && /^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s<>"'`]*)?$/i.test(value);
}

export function isEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(value);
}

export function isAddress(value: string): boolean {
  return value !== '' && Array.from(value).length <= MAX_ADDRESS_LENGTH;
}

const CHECKS: Readonly<Record<ContactField, (value: string) => boolean>> = { address: isAddress, phone: isPhone, website: isWebsite, email: isEmail };

/** True when the value may be shown for the field. An empty value is never well formed. */
export function contactFieldOk(field: ContactField, value: string): boolean {
  return value !== '' && CHECKS[field](value);
}

/** The contact as it is kept: spaces tidied, empty parts left out, and nothing at all when it holds nothing. Values are kept as written. */
export function tidyContact(contact: PlaceContact | undefined): PlaceContact | undefined {
  if (contact === undefined) return undefined;
  const out: { -readonly [K in ContactField]?: string } = {};
  for (const field of CONTACT_FIELDS) {
    const value = tidy(contact[field] ?? '');
    if (value !== '') out[field] = value;
  }
  if (Object.keys(out).length === 0) return undefined;
  return contact.provenance === undefined ? out : { ...out, provenance: contact.provenance };
}

/** Everything the contact holds, as one text. Two contacts with the same text are the same. */
export function contactKey(contact: PlaceContact | undefined): string {
  const t = tidyContact(contact);
  if (t === undefined) return '';
  const p = t.provenance;
  return JSON.stringify([...CONTACT_FIELDS.map((f) => t[f] ?? null), p === undefined ? null : [p.source.trim(), p.licence.trim(), p.date.trim(), p.tier ?? null, p.url ?? null]]);
}

export function contactIsUsable(contact: PlaceContact | undefined): boolean {
  return contact !== undefined && contact.provenance !== undefined && validateProvenance(contact.provenance).length === 0;
}

export interface EffectiveContact {
  /** Each part that may be shown, or '' when it is unknown. */
  readonly address: string;
  readonly phone: string;
  readonly website: string;
  readonly email: string;
  /** The source behind what is shown, or null when nothing is. */
  readonly provenance: Provenance | null;
}

const NOTHING: EffectiveContact = { address: '', phone: '', website: '', email: '', provenance: null };

/**
 * What may be shown about how to reach a place. Contact without a usable source gives nothing,
 * and a part that is not well formed is left out: it is never corrected or guessed.
 */
export function effectiveContact(place: Pick<Place, 'contact'>): EffectiveContact {
  const contact = tidyContact(place.contact);
  if (contact === undefined || contact.provenance === undefined || !contactIsUsable(contact)) return NOTHING;
  const part = (field: ContactField): string => {
    const value = contact[field] ?? '';
    return contactFieldOk(field, value) ? value : '';
  };
  const out = { address: part('address'), phone: part('phone'), website: part('website'), email: part('email') };
  if (CONTACT_FIELDS.every((f) => out[f] === '')) return NOTHING;
  return { ...out, provenance: contact.provenance };
}

/** true when at least one place holds something about how to reach it, usable or not. */
export function anyContact(places: readonly Place[]): boolean {
  return places.some((p) => p.contact !== undefined);
}

/** The place with its contact set, or without any when `contact` holds nothing. The place given is not changed. */
export function withContact(place: Place, contact: PlaceContact | undefined): Place {
  const next = tidyContact(contact);
  const { contact: _old, ...rest } = place;
  return next === undefined ? rest : { ...rest, contact: next };
}

const UNKNOWN_WORD_FR = unknownWord('fr');

export const CONTACT_UI = {
  en: {
    names: { address: 'Address', phone: 'Phone', website: 'Website', email: 'Email' },
    part: (name: string, value: string): string => `${name}: ${value}`,
    from: (source: string, date: string): string => `Source: ${source}, dated ${date}.`,
    notUsable: 'Contact details are held for this place, but they cannot be shown. They have no usable source, or they are not well formed.',
    listLabel: (place: string): string => `How to reach ${place}`,
    reachHeading: 'How to reach this place',
    coverageCaption: 'Contact details that can be shown, place by place',
    colDetail: 'Detail',
    colShown: 'Places where it is shown',
    colUnknown: 'Places where it is Unknown',
    coverageNone: 'No place has contact details yet.',
    sheetTitle: (place: string): string => `Questions to ask ${place}`,
    sheetMadeOn: (date: string): string => `Made on ${date} from the loaded records.`,
    sheetQuestions: 'Questions about what the records do not say',
    sheetNoQuestions: 'The records leave no question open for this visit.',
    sheetAnswer: 'Answer:',
    sheetSave: 'Save a sheet of questions for this place',
    unknownAll: 'Contact details for this place are Unknown.',
  },
  fr: {
    names: { address: 'Adresse', phone: 'Téléphone', website: 'Site Web', email: 'Courriel' },
    part: (name: string, value: string): string => `${name}\u00a0: ${value}`,
    from: (source: string, date: string): string => `Source\u00a0: ${source}, date du ${date}.`,
    notUsable: 'Des coordonnées sont conservées pour ce lieu, mais elles ne peuvent pas être affichées. Elles n’ont pas de source utilisable, ou elles sont mal formées.',
    listLabel: (place: string): string => `Comment joindre ${place}`,
    reachHeading: 'Comment joindre ce lieu',
    coverageCaption: 'Coordonnées qui peuvent être affichées, lieu par lieu',
    colDetail: 'Coordonnée',
    colShown: 'Lieux où elle est affichée',
    colUnknown: `Lieux où elle est ${UNKNOWN_WORD_FR}`,
    coverageNone: 'Aucun lieu n’a encore de coordonnées.',
    sheetTitle: (place: string): string => `Questions à poser à ${place}`,
    sheetMadeOn: (date: string): string => `Créé le ${date} à partir des fiches chargées.`,
    sheetQuestions: 'Questions sur ce que les fiches ne disent pas',
    sheetNoQuestions: 'Les fiches ne laissent aucune question ouverte pour cette visite.',
    sheetAnswer: 'Réponse\u00a0:',
    sheetSave: 'Enregistrer une feuille de questions pour ce lieu',
    unknownAll: 'Les coordonnées de ce lieu sont UNKNOWN.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** One part in words: "Phone: 416 555 0100", or "Phone: Unknown". Values are data and are not respaced. */
export function contactPartText(field: ContactField, value: string, lang: Lang): string {
  const ui = CONTACT_UI[lang];
  return value === '' ? fr(lang, ui.part(ui.names[field], unknownWord(lang))) : `${ui.names[field]}${lang === 'fr' ? '\u00a0:' : ':'} ${value}`;
}

export function contactSourceText(contact: EffectiveContact, lang: Lang): string {
  return contact.provenance === null ? '' : fr(lang, CONTACT_UI[lang].from(contact.provenance.source.trim(), contact.provenance.date));
}

/**
 * Every part on its own line, in the order of the form, with Unknown for a part that cannot be
 * shown, then the source. For text files and for the differences between two sets of records.
 */
export function contactLines(place: Pick<Place, 'contact'>, lang: Lang): readonly string[] {
  const contact = effectiveContact(place);
  const lines = CONTACT_FIELDS.map((f) => contactPartText(f, contact[f], lang));
  const source = contactSourceText(contact, lang);
  if (source !== '') lines.push(source);
  else if (place.contact !== undefined) lines.push(CONTACT_UI[lang].notUsable);
  return lines;
}

/** The lines as one sentence-like text: "Address: 1 Main Street. Phone: Unknown. ..." */
export function contactText(place: Pick<Place, 'contact'>, lang: Lang): string {
  const contact = effectiveContact(place);
  const parts = CONTACT_FIELDS.map((f) => `${contactPartText(f, contact[f], lang)}.`);
  const source = contactSourceText(contact, lang);
  if (source !== '') parts.push(source);
  else if (place.contact !== undefined) parts.push(CONTACT_UI[lang].notUsable);
  return parts.join(' ');
}

/**
 * How to reach a place, under its name: a short list with the parts that can be shown, as text.
 * The details are not made into links: this package's pages do not link to other sites or start
 * a call, and a person can select and copy the text. Nothing for a place that holds no contact;
 * a note when it holds some that cannot be shown.
 */
export function renderContact(place: Pick<Place, 'name' | 'contact'>, lang: Lang): string {
  if (place.contact === undefined) return '';
  const ui = CONTACT_UI[lang];
  const contact = effectiveContact(place);
  if (contact.provenance === null) return `<p class="gl-note gl-contact-note">${escapeHtml(ui.notUsable)}</p>`;
  const items = CONTACT_FIELDS.filter((f) => contact[f] !== '').map(
    (f) => `<li data-contact="${f}">${escapeHtml(ui.names[f])}${lang === 'fr' ? '\u00a0:' : ':'} <span class="gl-contact-value">${escapeHtml(contact[f])}</span></li>`,
  );
  return (
    `<ul class="gl-contact" aria-label="${escapeHtml(ui.listLabel(place.name))}">${items.join('')}</ul>` +
    `<p class="gl-note gl-contact-source">${escapeHtml(contactSourceText(contact, lang))}</p>`
  );
}

/** For the steps of a visit: a heading, then how to reach the place, or a line saying it is unknown. */
export function renderReach(place: Pick<Place, 'name' | 'contact'>, lang: Lang): string {
  const ui = CONTACT_UI[lang];
  const body = place.contact === undefined ? `<p class="gl-note" data-gl-reach-unknown>${escapeHtml(ui.unknownAll)}</p>` : renderContact(place, lang);
  return `<h5>${escapeHtml(ui.reachHeading)}</h5>${body}`;
}

export interface ContactCoverage {
  readonly field: ContactField;
  /** Places where this detail can be shown. */
  readonly shown: number;
  /** Places where it is unknown: none is held, or what is held cannot be shown. */
  readonly unknown: number;
}

/** For each detail, how many places show it and for how many it is unknown. */
export function contactCoverage(places: readonly Place[]): readonly ContactCoverage[] {
  const effective = places.map((p) => effectiveContact(p));
  return CONTACT_FIELDS.map((field) => {
    const shown = effective.filter((c) => c[field] !== '').length;
    return { field, shown, unknown: places.length - shown };
  });
}

/** A small table of the coverage, or a note when no place holds contact details. */
export function renderContactCoverage(places: readonly Place[], lang: Lang): string {
  const ui = CONTACT_UI[lang];
  if (!anyContact(places)) return `<p class="gl-note" data-gl-contact-none>${escapeHtml(ui.coverageNone)}</p>`;
  const rows = contactCoverage(places)
    .map((c) => `<tr data-contact="${c.field}"><th scope="row">${escapeHtml(ui.names[c.field])}</th><td>${c.shown}</td><td>${c.unknown}</td></tr>`)
    .join('');
  return (
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.coverageCaption)}" tabindex="0"><table class="gl-compare" data-gl-contact-coverage><caption>${escapeHtml(ui.coverageCaption)}</caption>` +
    `<thead><tr><th scope="col">${escapeHtml(ui.colDetail)}</th><th scope="col">${escapeHtml(ui.colShown)}</th><th scope="col">${escapeHtml(ui.colUnknown)}</th></tr></thead><tbody>${rows}</tbody></table></div>`
  );
}

export const SHEET_ID = 'gl-reach-sheet';

export function sheetFilename(lang: Lang): string {
  return `questions-for-a-place-${lang}.txt`;
}

/**
 * A sheet a person can print or keep open while they reach the place: how to reach it, then
 * each question the records leave open, with room for the answer. The questions are passed in,
 * so the sheet asks exactly what the steps of the visit list.
 */
export function reachSheet(place: Pick<Place, 'name' | 'contact'>, questions: readonly string[], lang: Lang, today: string): string {
  const ui = CONTACT_UI[lang];
  const lines = [fr(lang, ui.sheetTitle(place.name)), ui.sheetMadeOn(today), '', ui.reachHeading, ...contactLines(place, lang).map((l) => `- ${l}`), '', ui.sheetQuestions];
  if (questions.length === 0) lines.push(ui.sheetNoQuestions);
  questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`, `   ${ui.sheetAnswer}`, ''));
  return `${lines.join('\n').trimEnd()}\n`;
}

/** The button that saves the sheet, for a host that can save files. */
export function renderSheetButton(lang: Lang): string {
  return `<div class="gl-actions"><button type="button" class="gl-btn" id="${SHEET_ID}">${escapeHtml(CONTACT_UI[lang].sheetSave)}</button></div>`;
}

/* ---------- the form ---------- */

export interface ContactDraft {
  readonly address: string;
  readonly phone: string;
  readonly website: string;
  readonly email: string;
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  readonly tier: string;
}

export const EMPTY_CONTACT_DRAFT: ContactDraft = { address: '', phone: '', website: '', email: '', source: '', licence: '', date: '', tier: '' };
export const CONTACT_DRAFT_FIELDS = ['address', 'phone', 'website', 'email', 'source', 'licence', 'date', 'tier'] as const;
export type ContactDraftField = (typeof CONTACT_DRAFT_FIELDS)[number];

export type ContactProblem =
  | 'nothing-given'
  | 'address-too-long'
  | 'phone-invalid'
  | 'website-invalid'
  | 'email-invalid'
  | 'source-missing'
  | 'source-too-long'
  | 'licence-not-open'
  | 'date-invalid'
  | 'date-in-future'
  | 'tier-not-known';

export function contactFieldOf(problem: ContactProblem): ContactDraftField {
  if (problem === 'nothing-given' || problem === 'address-too-long') return 'address';
  if (problem === 'phone-invalid') return 'phone';
  if (problem === 'website-invalid') return 'website';
  if (problem === 'email-invalid') return 'email';
  if (problem === 'source-missing' || problem === 'source-too-long') return 'source';
  if (problem === 'licence-not-open') return 'licence';
  return problem === 'tier-not-known' ? 'tier' : 'date';
}

export function cleanContactDraft(d: ContactDraft): ContactDraft {
  return { address: tidy(d.address), phone: tidy(d.phone), website: d.website.trim(), email: d.email.trim(), source: tidy(d.source), licence: d.licence.trim(), date: d.date.trim(), tier: d.tier.trim() };
}

/** Everything that stops the draft from being saved, in the order of the form. Nothing is corrected for the person. */
export function contactDraftProblems(draft: ContactDraft, today: string): readonly ContactProblem[] {
  const d = cleanContactDraft(draft);
  const out: ContactProblem[] = [];
  if (CONTACT_FIELDS.every((f) => d[f] === '')) out.push('nothing-given');
  if (d.address !== '' && !isAddress(d.address)) out.push('address-too-long');
  if (d.phone !== '' && !isPhone(d.phone)) out.push('phone-invalid');
  if (d.website !== '' && !isWebsite(d.website)) out.push('website-invalid');
  if (d.email !== '' && !isEmail(d.email)) out.push('email-invalid');
  if (Array.from(d.source).length > MAX_SOURCE_NAME) out.push('source-too-long');
  for (const issue of validateProvenance({ source: d.source, licence: d.licence, date: d.date }, today)) {
    if (issue === 'source-missing' || issue === 'licence-not-open' || issue === 'date-invalid' || issue === 'date-in-future') out.push(issue);
  }
  if (d.tier !== '' && !(isTier(d.tier) && EMITTED_TIERS.includes(d.tier))) out.push('tier-not-known');
  return out;
}

/** The contact a clean, valid draft stands for. */
export function contactFromDraft(draft: ContactDraft): PlaceContact {
  const d = cleanContactDraft(draft);
  const provenance: Provenance = { source: d.source, licence: d.licence, date: d.date, ...(d.tier === '' ? {} : { tier: d.tier }) };
  return tidyContact({ address: d.address, phone: d.phone, website: d.website, email: d.email, provenance }) ?? { provenance };
}

/** The draft that shows what a place holds now, or an empty draft when it holds nothing. */
export function draftFromContact(contact: PlaceContact | undefined): ContactDraft {
  if (contact === undefined) return EMPTY_CONTACT_DRAFT;
  const p = contact.provenance;
  return {
    address: contact.address ?? '',
    phone: contact.phone ?? '',
    website: contact.website ?? '',
    email: contact.email ?? '',
    source: p?.source ?? '',
    licence: p?.licence ?? '',
    date: p?.date ?? '',
    tier: typeof p?.tier === 'string' ? p.tier : '',
  };
}

export type ContactOutcome = 'saved' | 'same' | 'invalid' | 'missing' | 'removed' | 'nothing-to-remove';

export interface ContactResult {
  readonly outcome: ContactOutcome;
  readonly places: readonly Place[];
  readonly problems: readonly ContactProblem[];
}

/** Sets how to reach one place. The places are returned as they were unless the outcome is "saved". */
export function setPlaceContact(places: readonly Place[], index: number, draft: ContactDraft, today: string): ContactResult {
  const place = places[index];
  if (place === undefined) return { outcome: 'missing', places, problems: [] };
  const problems = contactDraftProblems(draft, today);
  if (problems.length > 0) return { outcome: 'invalid', places, problems };
  const contact = contactFromDraft(draft);
  if (contactKey(contact) === contactKey(place.contact)) return { outcome: 'same', places, problems: [] };
  return { outcome: 'saved', places: places.map((p, i) => (i === index ? withContact(p, contact) : p)), problems: [] };
}

export function removePlaceContact(places: readonly Place[], index: number): ContactResult {
  const place = places[index];
  if (place === undefined) return { outcome: 'missing', places, problems: [] };
  if (place.contact === undefined) return { outcome: 'nothing-to-remove', places, problems: [] };
  return { outcome: 'removed', places: places.map((p, i) => (i === index ? withContact(p, undefined) : p)), problems: [] };
}

export const CONTACTFORM_UI = {
  en: {
    heading: 'Set how to reach a place',
    intro: 'Contact details need a source, an open licence and a date, like a record. Copy them as the source gives them.',
    legend: 'Contact details',
    place: 'Place to reach',
    choosePlace: 'Choose a place',
    address: 'Street address',
    phone: 'Phone number',
    website: 'Website, starting with https',
    email: 'Email address',
    source: 'Source of the contact details',
    licence: 'Licence of the source',
    chooseLicence: 'Choose a licence',
    date: 'Date of the source (year-month-day)',
    tier: 'Tier of the source',
    noTier: 'No tier',
    save: 'Save the contact details',
    remove: 'Remove the contact details',
    noPlaces: 'Add a place before you set how to reach it.',
    pickFirst: 'Choose a place to reach first.',
    invalid: (n: number): string => (n === 1 ? 'There is 1 thing to fix before this can be saved.' : `There are ${n} things to fix before this can be saved.`),
    problems: {
      'nothing-given': 'Give an address, a phone number, a website or an email.',
      'address-too-long': `Use ${MAX_ADDRESS_LENGTH} characters or fewer for the address.`,
      'phone-invalid': 'Give the phone number with 7 to 15 digits, such as 416 555 0100.',
      'website-invalid': 'Give the website as a full address that starts with https.',
      'email-invalid': 'Give the email as a full address, such as info@example.org.',
      'source-missing': 'Say where the contact details come from.',
      'source-too-long': `Use ${MAX_SOURCE_NAME} characters or fewer for the source.`,
      'licence-not-open': 'Choose an open licence from the list.',
      'date-invalid': 'Give a real date as year-month-day, such as 2026-06-01.',
      'date-in-future': 'The date cannot be after today.',
      'tier-not-known': 'Choose a tier from the list, or no tier.',
    },
    saved: (place: string): string => `Saved how to reach ${place}.`,
    same: 'The place already has these contact details.',
    removed: (place: string): string => `Removed the contact details of ${place}.`,
    nothingToRemove: 'This place has no contact details to remove.',
  },
  fr: {
    heading: 'Indiquer comment joindre un lieu',
    intro: 'Les coordonnées demandent une source, une licence ouverte et une date, comme une fiche. Copiez-les telles que la source les donne.',
    legend: 'Coordonnées',
    place: 'Lieu à joindre',
    choosePlace: 'Choisir un lieu',
    address: 'Adresse municipale',
    phone: 'Numéro de téléphone',
    website: 'Site Web, commençant par https',
    email: 'Adresse de courriel',
    source: 'Source des coordonnées',
    licence: 'Licence de la source',
    chooseLicence: 'Choisir une licence',
    date: 'Date de la source (année-mois-jour)',
    tier: 'Niveau de la source',
    noTier: 'Aucun niveau',
    save: 'Enregistrer les coordonnées',
    remove: 'Retirer les coordonnées',
    noPlaces: 'Ajoutez un lieu avant d’indiquer comment le joindre.',
    pickFirst: 'Choisissez d’abord un lieu à joindre.',
    invalid: (n: number): string => (n === 1 ? 'Il y a 1 élément à corriger avant l’enregistrement.' : `Il y a ${n} éléments à corriger avant l’enregistrement.`),
    problems: {
      'nothing-given': 'Donnez une adresse, un numéro de téléphone, un site Web ou un courriel.',
      'address-too-long': `Utilisez ${MAX_ADDRESS_LENGTH} caractères ou moins pour l’adresse.`,
      'phone-invalid': 'Donnez le numéro de téléphone avec 7 à 15 chiffres, par exemple 416 555 0100.',
      'website-invalid': 'Donnez le site Web comme une adresse complète qui commence par https.',
      'email-invalid': 'Donnez le courriel comme une adresse complète, par exemple info@example.org.',
      'source-missing': 'Dites d’où viennent les coordonnées.',
      'source-too-long': `Utilisez ${MAX_SOURCE_NAME} caractères ou moins pour la source.`,
      'licence-not-open': 'Choisissez une licence ouverte dans la liste.',
      'date-invalid': 'Donnez une vraie date sous la forme année-mois-jour, par exemple 2026-06-01.',
      'date-in-future': 'La date ne peut pas être après aujourd’hui.',
      'tier-not-known': 'Choisissez un niveau dans la liste, ou aucun niveau.',
    },
    saved: (place: string): string => `Coordonnées enregistrées pour ${place}.`,
    same: 'Le lieu a déjà ces coordonnées.',
    removed: (place: string): string => `Coordonnées retirées pour ${place}.`,
    nothingToRemove: 'Ce lieu n’a pas de coordonnées à retirer.',
  },
} as const;

export const CONTACTFORM_IDS = {
  place: 'gl-pc-place',
  address: 'gl-pc-address',
  phone: 'gl-pc-phone',
  website: 'gl-pc-website',
  email: 'gl-pc-email',
  source: 'gl-pc-source',
  licence: 'gl-pc-licence',
  date: 'gl-pc-date',
  tier: 'gl-pc-tier',
  save: 'gl-pc-save',
  remove: 'gl-pc-remove',
} as const;

/** What to say after the form was used. Empty for an invalid draft: the list of things to fix says it. */
export function contactMessage(result: ContactResult, placeName: string, lang: Lang): string {
  const ui = CONTACTFORM_UI[lang];
  switch (result.outcome) {
    case 'saved':
      return fr(lang, ui.saved(placeName));
    case 'same':
      return ui.same;
    case 'removed':
      return fr(lang, ui.removed(placeName));
    case 'nothing-to-remove':
      return ui.nothingToRemove;
    case 'missing':
      return ui.pickFirst;
    default:
      return '';
  }
}

export interface ContactFormView {
  readonly lang: Lang;
  readonly places: readonly Place[];
  /** The place the form is about, by position, or null when none is chosen. */
  readonly placeIndex: number | null;
  readonly draft: ContactDraft;
  readonly message?: string | undefined;
  readonly problems?: readonly ContactProblem[] | undefined;
}

/** The form: the place, the four contact details, the source, licence, date and tier, and the two buttons. */
export function renderContactForm(view: ContactFormView): string {
  const ui = CONTACTFORM_UI[view.lang];
  const head = `<h4>${escapeHtml(ui.heading)}</h4><p>${escapeHtml(ui.intro)}</p>`;
  if (view.places.length === 0) return `${head}<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const problems = view.problems ?? [];
  const bad = new Set(problems.map(contactFieldOf));
  const mark = (f: ContactDraftField): string => (bad.has(f) ? ' aria-invalid="true" aria-describedby="gl-pc-errors"' : '');
  const option = (value: string, label: string, chosen: string): string => `<option value="${escapeHtml(value)}"${value === chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const d = view.draft;
  const chosenPlace = view.placeIndex !== null && view.places[view.placeIndex] !== undefined ? String(view.placeIndex) : '';
  const placeOptions = option('', ui.choosePlace, chosenPlace) + view.places.map((p, i) => option(String(i), p.name, chosenPlace)).join('');
  const licences = option('', ui.chooseLicence, d.licence) + OPEN_LICENCES.map((id) => option(id, licenceLabel(id), d.licence)).join('');
  const tiers = option('', ui.noTier, d.tier) + EMITTED_TIERS.map((t) => option(t, TIER_UI[view.lang].names[t], d.tier)).join('');
  const label = (id: string, text: string): string => `<label for="${id}">${escapeHtml(text)}</label>`;
  const input = (f: Exclude<ContactDraftField, 'licence' | 'tier'>, text: string, max: number, type = 'text', hint = ''): string =>
    `${label(CONTACTFORM_IDS[f], text)}<input type="${type}" id="${CONTACTFORM_IDS[f]}" class="gl-input" maxlength="${max}" autocomplete="off"${hint} value="${escapeHtml(d[f])}"${mark(f)}>`;
  const select = (f: 'licence' | 'tier', text: string, options: string): string => `${label(CONTACTFORM_IDS[f], text)}<select id="${CONTACTFORM_IDS[f]}" class="gl-select"${mark(f)}>${options}</select>`;
  const errors =
    problems.length === 0
      ? ''
      : `<div id="gl-pc-errors" role="alert"><p>${escapeHtml(ui.invalid(problems.length))}</p><ul>${problems.map((p) => `<li>${escapeHtml(ui.problems[p])}</li>`).join('')}</ul></div>`;
  const status = problems.length === 0 ? `<p role="status" data-gl-pc-msg>${escapeHtml(view.message ?? '')}</p>` : '';
  const hasContact = view.placeIndex !== null && view.places[view.placeIndex]?.contact !== undefined;
  const remove = hasContact ? `<button type="button" class="gl-btn" id="${CONTACTFORM_IDS.remove}">${escapeHtml(ui.remove)}</button>` : '';
  return (
    `${head}<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.legend)}</legend>` +
    `${label(CONTACTFORM_IDS.place, ui.place)}<select id="${CONTACTFORM_IDS.place}" class="gl-select">${placeOptions}</select>` +
    input('address', ui.address, MAX_ADDRESS_LENGTH * 2) +
    input('phone', ui.phone, MAX_PHONE_LENGTH * 2, 'tel', ' inputmode="tel"') +
    input('website', ui.website, MAX_WEBSITE_LENGTH * 2, 'url', ' inputmode="url" spellcheck="false"') +
    input('email', ui.email, MAX_EMAIL_LENGTH * 2, 'email', ' inputmode="email" spellcheck="false"') +
    input('source', ui.source, MAX_SOURCE_NAME) +
    select('licence', ui.licence, licences) +
    input('date', ui.date, 10) +
    select('tier', ui.tier, tiers) +
    `${errors}${status}<div class="gl-actions"><button type="button" class="gl-btn" id="${CONTACTFORM_IDS.save}">${escapeHtml(ui.save)}</button>${remove}</div></fieldset>`
  );
}
