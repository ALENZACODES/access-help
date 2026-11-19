import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { OPEN_LICENCES, isOpenLicence, type OpenLicence, type Provenance } from './provenance';
import { escapeHtml } from './text';

/**
 * A short, plain summary of what each open data licence asks of someone who shares the data.
 * It is a reading aid kept with the data so it works offline. It is not legal advice, and the
 * licence text itself is what counts.
 */
export interface LicenceFacts {
  /** The licence's own name. Names are proper nouns and are the same in both languages. */
  readonly name: string;
  /** true when you must say where the data came from. */
  readonly credit: boolean;
  /** true when changed data must be shared under the same licence. */
  readonly sameLicence: boolean;
  /** true when the licence notice must be kept with copies. */
  readonly keepNotice: boolean;
}

export const LICENCE_FACTS: Readonly<Record<OpenLicence, LicenceFacts>> = {
  'CC0-1.0': { name: 'Creative Commons Zero 1.0', credit: false, sameLicence: false, keepNotice: false },
  'CC-BY-4.0': { name: 'Creative Commons Attribution 4.0', credit: true, sameLicence: false, keepNotice: false },
  'CC-BY-SA-4.0': { name: 'Creative Commons Attribution-ShareAlike 4.0', credit: true, sameLicence: true, keepNotice: false },
  'ODbL-1.0': { name: 'Open Database License 1.0', credit: true, sameLicence: true, keepNotice: false },
  'ODC-By-1.0': { name: 'Open Data Commons Attribution License 1.0', credit: true, sameLicence: false, keepNotice: false },
  'PDDL-1.0': { name: 'Open Data Commons Public Domain Dedication and License 1.0', credit: false, sameLicence: false, keepNotice: false },
  'OGL-Canada-2.0': { name: 'Open Government Licence – Canada 2.0', credit: true, sameLicence: false, keepNotice: false },
  'OGL-UK-3.0': { name: 'Open Government Licence 3.0 (United Kingdom)', credit: true, sameLicence: false, keepNotice: false },
  MIT: { name: 'MIT License', credit: false, sameLicence: false, keepNotice: true },
  'Apache-2.0': { name: 'Apache License 2.0', credit: false, sameLicence: false, keepNotice: true },
  'BSD-3-Clause': { name: 'BSD 3-Clause License', credit: false, sameLicence: false, keepNotice: true },
};

/** The facts for a licence id, or null when it is not one of the open licences we accept. */
export function licenceFacts(licence: string): LicenceFacts | null {
  return isOpenLicence(licence) ? LICENCE_FACTS[licence] : null;
}

export const LICENCE_UI = {
  en: {
    heading: 'What the licences ask',
    note: 'This is a short summary, not legal advice. The licence text is what counts.',
    credit: 'Say where the data came from.',
    sameLicence: 'Share changed data under the same licence.',
    keepNotice: 'Keep the licence notice with copies.',
    free: 'No conditions for sharing.',
    notOpen: 'This is not an open licence we accept. Do not share the data.',
    credits: (source: string, date: string): string => `Contains information from ${source}, dated ${date}.`,
    under: (licence: string): string => `Licence: ${licence}.`,
  },
  fr: {
    heading: 'Ce que demandent les licences',
    note: 'Ceci est un court résumé, pas un avis juridique. C’est le texte de la licence qui compte.',
    credit: 'Dites d’où viennent les données.',
    sameLicence: 'Partagez les données modifiées sous la même licence.',
    keepNotice: 'Gardez l’avis de licence avec les copies.',
    free: 'Aucune condition pour le partage.',
    notOpen: 'Ce n’est pas une licence ouverte que nous acceptons. Ne partagez pas les données.',
    credits: (source: string, date: string): string => `Contient de l’information de ${source}, datée du ${date}.`,
    under: (licence: string): string => `Licence\u00a0: ${licence}.`,
  },
} as const;

/** What the licence asks, as short sentences. A licence we do not accept gets one warning sentence. */
export function licenceDuties(licence: string, lang: Lang): readonly string[] {
  const ui = LICENCE_UI[lang];
  const facts = licenceFacts(licence);
  if (facts === null) return [ui.notOpen];
  const out: string[] = [];
  if (facts.credit) out.push(ui.credit);
  if (facts.sameLicence) out.push(ui.sameLicence);
  if (facts.keepNotice) out.push(ui.keepNotice);
  return out.length === 0 ? [ui.free] : out;
}

/** "CC-BY-4.0 (Creative Commons Attribution 4.0)", or the id alone when we do not know the licence. */
export function licenceLabel(licence: string): string {
  const facts = licenceFacts(licence);
  return facts === null ? licence : `${licence} (${facts.name})`;
}

/** true when sharing the data means saying where it came from. Unknown licences count as yes, to be safe. */
export function needsCredit(licence: string): boolean {
  return licenceFacts(licence)?.credit ?? true;
}

/** One credit for a source: where the information is from, its date and its licence. */
export function creditLine(p: Pick<Provenance, 'source' | 'licence' | 'date'>, lang: Lang): string {
  const ui = LICENCE_UI[lang];
  const text = `${ui.credits(p.source, p.date)} ${ui.under(licenceLabel(p.licence))}`;
  return lang === 'fr' ? fixFrench(text) : text;
}

/** The licences in use, each with what it asks. Licences are listed once, in the order given. */
export function renderLicenceDuties(licences: readonly string[], lang: Lang): string {
  const ui = LICENCE_UI[lang];
  const unique = [...new Set(licences)];
  if (unique.length === 0) return '';
  const items = unique
    .map((id) => `<dt>${escapeHtml(licenceLabel(id))}</dt>` + licenceDuties(id, lang).map((d) => `<dd>${escapeHtml(d)}</dd>`).join(''))
    .join('');
  return `<h4>${escapeHtml(ui.heading)}</h4><dl class="gl-licences">${items}</dl><p class="gl-note">${escapeHtml(ui.note)}</p>`;
}

/** Every licence id we accept, for checks. */
export function knownLicences(): readonly OpenLicence[] {
  return OPEN_LICENCES;
}
