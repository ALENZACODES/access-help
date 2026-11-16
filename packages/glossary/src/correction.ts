import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { cleanNote } from './notes';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { formatProvenance } from './provenance';
import { mergeClaims, statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * A draft report for a person who sees something wrong about a place. The draft says what this app shows
 * and what the person wrote, in their own words. It is a note for whoever keeps the data. It is not
 * sent anywhere by this package, and it changes nothing the app shows.
 */
export const CORRECTION_UI = {
  en: {
    summary: 'Report a problem with this information',
    summaryLabel: (name: string): string => `Report a problem with the information about ${name}`,
    featureLabel: 'Which feature?',
    whole: 'The place in general',
    noteLabel: 'What did you notice? (your own words)',
    make: 'Make a report to copy',
    title: 'Report about place information',
    place: 'Place',
    feature: 'Feature',
    shows: 'What this app shows',
    mine: 'What I noticed',
    written: 'Written on',
    ownWords: 'This is my own report, in my own words.',
  },
  fr: {
    summary: 'Signaler un problème avec ces renseignements',
    summaryLabel: (name: string): string => `Signaler un problème avec les renseignements sur ${name}`,
    featureLabel: 'Quelle caractéristique\u202f?',
    whole: 'Le lieu en général',
    noteLabel: 'Qu’avez-vous remarqué\u202f? (dans vos mots)',
    make: 'Préparer un signalement à copier',
    title: 'Signalement sur les renseignements d’un lieu',
    place: 'Lieu',
    feature: 'Caractéristique',
    shows: 'Ce que cette application indique',
    mine: 'Ce que j’ai remarqué',
    written: 'Écrit le',
    ownWords: 'Ce signalement est le mien, dans mes propres mots.',
  },
} as const;

export const CORRECTION_MIME = 'text/plain;charset=utf-8';

export function fixId(index: number): string {
  return `gl-fix-${index}`;
}
export function fixFeatureId(index: number): string {
  return `gl-fixf-${index}`;
}
export function fixNoteId(index: number): string {
  return `gl-fixn-${index}`;
}

export function parseFixId(id: string): number | null {
  const m = /^gl-fix-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** A feature id that is a known term, or null for "the place in general" and anything unknown. */
export function knownFeature(value: string): string | null {
  return TERMS.some((t) => t.id === value) ? value : null;
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** The form shown under a place, folded away until wanted. */
export function renderCorrectionForm(place: Place, index: number, lang: Lang): string {
  const ui = CORRECTION_UI[lang];
  const options = TERMS.map((t) => `<option value="${t.id}">${escapeHtml(lookupTerm(t.id, lang).term)}</option>`).join('');
  return (
    `<details class="gl-fix"><summary aria-label="${escapeHtml(fr(lang, ui.summaryLabel(place.name)))}">${escapeHtml(ui.summary)}</summary>` +
    `<label for="${fixFeatureId(index)}">${escapeHtml(ui.featureLabel)}</label>` +
    `<select id="${fixFeatureId(index)}" class="gl-select"><option value="">${escapeHtml(ui.whole)}</option>${options}</select>` +
    `<label for="${fixNoteId(index)}">${escapeHtml(ui.noteLabel)}</label>` +
    `<textarea id="${fixNoteId(index)}" class="gl-textarea" rows="3" maxlength="500"></textarea>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${fixId(index)}">${escapeHtml(ui.make)}</button></div></details>`
  );
}

/**
 * The report as plain text: the place, the feature, what this app shows for it (status and source, or Unknown),
 * then the person's own words and the date. Null when the person wrote nothing.
 */
export function composeCorrection(place: Place, featureId: string | null, note: string, lang: Lang, today: string): string | null {
  const own = cleanNote(note);
  if (own === '') return null;
  const ui = CORRECTION_UI[lang];
  const colon = lang === 'fr' ? '\u00a0:' : ':';
  const lines: string[] = [ui.title, '', `${ui.place}${colon} ${place.name}`];
  if (featureId !== null) {
    lines.push(`${ui.feature}${colon} ${lookupTerm(featureId, lang).term}`);
    const merged = mergeClaims([featureId], place.claims)[0];
    if (merged !== undefined) {
      lines.push(`${ui.shows}${colon} ${statusLabel(merged.status, lang, merged.conflict)}`);
      if (merged.status !== 'unknown' && merged.provenance !== undefined) lines.push(formatProvenance(merged.provenance, lang));
    }
  }
  const fixed = lang === 'fr' ? lines.map((l) => fixFrench(l)) : lines;
  // The person's own words are kept exactly as written.
  return [...fixed, '', fr(lang, `${ui.mine}${colon}`), own, '', fr(lang, `${ui.written}${colon} ${today}`), ui.ownWords, ''].join('\n');
}

export function correctionFilename(place: Place, lang: Lang): string {
  const slug = place.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'place';
  return `report-${slug}-${lang}.txt`;
}
