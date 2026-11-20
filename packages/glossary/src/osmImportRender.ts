import { fixFrench } from './frTypography';
import { featureName } from './mustHaves';
import { MAX_OSM_ELEMENTS, OSM_LICENCE, OSM_SOURCE, TAG_RULES, recordDateSpan, tallyByFeature, type OsmCounts, type OsmProblem, type OsmResult } from './osmImport';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';
import { stepFeatureLine } from './visitStepsRender';

/** The words and the markup for "Bring in open map data": the box, the check, and what would be added. */
export const OSM_UI = {
  en: {
    heading: 'Bring in open map data',
    intro: 'Paste data exported from OpenStreetMap. This page reads a few tags about features and turns them into records. It does not go online.',
    licence: (source: string, licence: string): string => `Each record keeps ${source} as its source, under the ${licence} licence.`,
    general: 'A general wheelchair tag is not used. It does not say which feature is there.',
    tagsHeading: 'Tags this page reads',
    textLabel: 'Map data, pasted as text',
    formats: 'The page reads an export from the OpenStreetMap site, an Overpass export, or GeoJSON made from one.',
    check: 'Check this map data',
    add: 'Add these records to the records held',
    save: 'Save these records as a table',
    problems: {
      empty: 'Paste map data first.',
      'too-large': 'This is too much data for this page. Export a smaller area.',
      'not-json': 'This text could not be read as data. Nothing was read.',
      'not-map-data': 'This data is not map data this page can read. Nothing was read.',
      'too-many-elements': `There are more than ${MAX_OSM_ELEMENTS} elements. Export a smaller area.`,
    },
    read: (n: number): string => `Elements read from the data: ${n}.`,
    made: (places: number, records: number): string => `Places with records: ${places}. Records made: ${records}.`,
    nothing: 'No record could be made from this data.',
    leftHeading: 'What was left out, and why',
    left: {
      noFeatureTags: (n: number): string => `Elements with no tag about a feature: ${n}.`,
      generalOnly: (n: number): string => `Of those, elements with only a general wheelchair tag: ${n}.`,
      noName: (n: number): string => `Elements with no name: ${n}.`,
      noDate: (n: number): string => `Elements with no usable date: ${n}.`,
      conflicts: (n: number): string => `Features with two tags that disagree: ${n}.`,
      skipped: (n: number): string => `Entries that are not map elements, or that came twice: ${n}.`,
    },
    replaces: (n: number): string => (n === 1 ? '1 older record from the same map element would be replaced by a newer one.' : `${n} older records from the same map elements would be replaced by newer ones.`),
    replaced: (n: number): string => (n === 1 ? '1 older record was replaced by a newer one.' : `${n} older records were replaced by newer ones.`),
    dates: (oldest: string, newest: string): string => (oldest === newest ? `Every record is dated ${oldest}.` : `The records are dated from ${oldest} to ${newest}.`),
    tallyCaption: 'Records made for each feature',
    colFeature: 'Feature',
    colAvailable: 'Reported as available',
    colNotAvailable: 'Reported as not available',
    caption: 'The places and the records that would be added',
    colPlace: 'Place',
    colRecords: 'Records',
    more: (n: number): string => (n === 1 ? '1 more place is not shown here. It would be added too.' : `${n} more places are not shown here. They would be added too.`),
  },
  fr: {
    heading: 'Importer des données cartographiques ouvertes',
    intro: 'Collez des données exportées d’OpenStreetMap. Cette page lit quelques étiquettes sur les caractéristiques et en fait des fiches. Elle ne va pas en ligne.',
    licence: (source: string, licence: string): string => `Chaque fiche garde ${source} comme source, sous la licence ${licence}.`,
    general: 'L’étiquette générale wheelchair n’est pas utilisée. Elle ne dit pas quelle caractéristique est là.',
    tagsHeading: 'Étiquettes que cette page lit',
    textLabel: 'Données cartographiques, collées en texte',
    formats: 'La page lit un export du site OpenStreetMap, un export Overpass, ou du GeoJSON créé à partir d’un tel export.',
    check: 'Examiner ces données',
    add: 'Ajouter ces fiches aux fiches gardées',
    save: 'Enregistrer ces fiches en tableau',
    problems: {
      empty: 'Collez d’abord des données cartographiques.',
      'too-large': 'Il y a trop de données pour cette page. Exportez une zone plus petite.',
      'not-json': 'Ce texte ne peut pas être lu comme des données. Rien n’a été lu.',
      'not-map-data': 'Ces données ne sont pas des données cartographiques que cette page peut lire. Rien n’a été lu.',
      'too-many-elements': `Il y a plus de ${MAX_OSM_ELEMENTS} éléments. Exportez une zone plus petite.`,
    },
    read: (n: number): string => `Éléments lus dans les données\u00a0: ${n}.`,
    made: (places: number, records: number): string => `Lieux avec des fiches\u00a0: ${places}. Fiches créées\u00a0: ${records}.`,
    nothing: 'Aucune fiche n’a pu être créée à partir de ces données.',
    leftHeading: 'Ce qui a été laissé de côté, et pourquoi',
    left: {
      noFeatureTags: (n: number): string => `Éléments sans étiquette sur une caractéristique\u00a0: ${n}.`,
      generalOnly: (n: number): string => `Parmi eux, éléments avec seulement l’étiquette générale wheelchair\u00a0: ${n}.`,
      noName: (n: number): string => `Éléments sans nom\u00a0: ${n}.`,
      noDate: (n: number): string => `Éléments sans date utilisable\u00a0: ${n}.`,
      conflicts: (n: number): string => `Caractéristiques où deux étiquettes d’un élément ne concordent pas\u00a0: ${n}.`,
      skipped: (n: number): string => `Entrées qui ne sont pas des éléments de carte, ou qui sont en double\u00a0: ${n}.`,
    },
    replaces: (n: number): string => (n === 1 ? '1 fiche plus ancienne du même élément de carte serait remplacée par une plus récente.' : `${n} fiches plus anciennes des mêmes éléments de carte seraient remplacées par des plus récentes.`),
    replaced: (n: number): string => (n === 1 ? '1 fiche plus ancienne a été remplacée par une plus récente.' : `${n} fiches plus anciennes ont été remplacées par des plus récentes.`),
    dates: (oldest: string, newest: string): string => (oldest === newest ? `Chaque fiche porte la date du ${oldest}.` : `Les fiches portent des dates du ${oldest} au ${newest}.`),
    tallyCaption: 'Fiches créées pour chaque caractéristique',
    colFeature: 'Caractéristique',
    colAvailable: 'Signalé comme disponible',
    colNotAvailable: 'Signalé comme non disponible',
    caption: 'Les lieux et les fiches qui seraient ajoutés',
    colPlace: 'Lieu',
    colRecords: 'Fiches',
    more: (n: number): string => (n === 1 ? '1 autre lieu n’est pas affiché ici. Il serait ajouté aussi.' : `${n} autres lieux ne sont pas affichés ici. Ils seraient ajoutés aussi.`),
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const OSM_IDS = { text: 'gl-osm-text', check: 'gl-osm-check', add: 'gl-osm-add', save: 'gl-osm-save' } as const;
export const MAX_OSM_ROWS_SHOWN = 20;
export const OSM_RECORDS_FILENAME = 'open-map-records.csv';

/** The first problem in words, or an empty string when the data could be read. */
export function osmProblemText(problems: readonly OsmProblem[], lang: Lang): string {
  const first = problems[0];
  return first === undefined ? '' : OSM_UI[lang].problems[first];
}

/** How many elements were read and what came of them, in one line. */
export function osmStatusText(result: Pick<OsmResult, 'counts' | 'problems'>, lang: Lang): string {
  const ui = OSM_UI[lang];
  if (result.problems.length > 0) return osmProblemText(result.problems, lang);
  const made = result.counts.records === 0 ? ui.nothing : ui.made(result.counts.places, result.counts.records);
  return fr(lang, `${ui.read(result.counts.elements)} ${made}`);
}

/** One line for each reason something was left out. Reasons that did not happen are not listed. */
export function osmLeftOut(counts: OsmCounts, skipped: number, lang: Lang): readonly string[] {
  const ui = OSM_UI[lang].left;
  const out: string[] = [];
  if (counts.noFeatureTags > 0) out.push(ui.noFeatureTags(counts.noFeatureTags));
  if (counts.generalOnly > 0) out.push(ui.generalOnly(counts.generalOnly));
  if (counts.noName > 0) out.push(ui.noName(counts.noName));
  if (counts.noDate > 0) out.push(ui.noDate(counts.noDate));
  if (counts.conflicts > 0) out.push(ui.conflicts(counts.conflicts));
  if (skipped > 0) out.push(ui.skipped(skipped));
  return out.map((line) => fr(lang, line));
}

/** The records of one place that would be added, as the list words them. */
export function osmRecordLines(place: Place, lang: Lang): readonly string[] {
  return place.claims.map((c) => stepFeatureLine({ termId: c.termId, state: c.status === 'present' ? 'available' : c.status === 'absent' ? 'not-available' : 'unknown' }, lang));
}

/** How old the records would be: one line with the oldest and the newest date, or nothing for no records. */
export function osmDatesText(places: readonly Place[], lang: Lang): string {
  const span = recordDateSpan(places);
  return span === null ? '' : OSM_UI[lang].dates(span.oldest, span.newest);
}

/** A small table: for each feature a tag is read for, how many records say available and how many say not available. */
export function renderOsmTally(places: readonly Place[], lang: Lang): string {
  const ui = OSM_UI[lang];
  const rows = tallyByFeature(places)
    .map((t) => `<tr data-feature="${t.termId}"><th scope="row">${escapeHtml(featureName(t.termId, lang))}</th><td>${t.available}</td><td>${t.notAvailable}</td></tr>`)
    .join('');
  return (
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.tallyCaption)}" tabindex="0"><table class="gl-compare" data-gl-osm-tally><caption>${escapeHtml(ui.tallyCaption)}</caption>` +
    `<thead><tr><th scope="col">${escapeHtml(ui.colFeature)}</th><th scope="col">${escapeHtml(ui.colAvailable)}</th><th scope="col">${escapeHtml(ui.colNotAvailable)}</th></tr></thead><tbody>${rows}</tbody></table></div>`
  );
}

/** The tags that are read and the feature each is about. Tag names are shown as they are written in the data. */
export function renderOsmTags(lang: Lang): string {
  const items = TAG_RULES.map((rule) => `<li>${rule.keys.map((k) => `<code>${escapeHtml(k)}</code>`).join(', ')}${lang === 'fr' ? '\u00a0:' : ':'} ${escapeHtml(featureName(rule.termId, lang))}</li>`).join('');
  return `<h4>${escapeHtml(OSM_UI[lang].tagsHeading)}</h4><ul class="gl-osm-tags">${items}</ul>`;
}

export interface OsmResultView {
  readonly lang: Lang;
  /** The last check, or null when nothing was checked yet. */
  readonly result: OsmResult | null;
  readonly canExport: boolean;
  /** What happened when the records were added, or another note for the person. */
  readonly message?: string | undefined;
  /** How many records held would give way to newer ones from the same map element. */
  readonly replaces?: number | undefined;
  readonly limit?: number;
}

/** The outcome of a check: a status, what was left out, the places and records, and the two buttons. */
export function renderOsmResult(view: OsmResultView): string {
  const ui = OSM_UI[view.lang];
  const note = view.message === undefined || view.message === '' ? '' : `<p role="status" data-gl-osm-msg>${escapeHtml(view.message)}</p>`;
  const result = view.result;
  if (result === null) return note;
  if (result.problems.length > 0) return `<p role="alert" data-gl-osm-problem>${escapeHtml(osmProblemText(result.problems, view.lang))}</p>`;
  const left = osmLeftOut(result.counts, result.skipped, view.lang);
  const leftHtml = left.length === 0 ? '' : `<h4>${escapeHtml(ui.leftHeading)}</h4><ul data-gl-osm-left>${left.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  const status = `<p role="status" data-gl-osm-status>${escapeHtml(osmStatusText(result, view.lang))}</p>`;
  if (result.places.length === 0) return `${status}${leftHtml}${note}`;
  const limit = view.limit ?? MAX_OSM_ROWS_SHOWN;
  const rows = result.places
    .slice(0, limit)
    .map((p) => `<tr><th scope="row">${escapeHtml(p.name)}</th><td>${osmRecordLines(p, view.lang).map(escapeHtml).join('<br>')}</td></tr>`)
    .join('');
  const hidden = result.places.length - Math.min(result.places.length, limit);
  const replaces = (view.replaces ?? 0) > 0 ? `<p data-gl-osm-replaces>${escapeHtml(ui.replaces(view.replaces ?? 0))}</p>` : '';
  const more = hidden > 0 ? `<p class="gl-note" data-gl-osm-more>${escapeHtml(ui.more(hidden))}</p>` : '';
  const save = view.canExport ? `<button type="button" class="gl-btn" id="${OSM_IDS.save}">${escapeHtml(ui.save)}</button>` : '';
  return (
    `${status}<p data-gl-osm-dates>${escapeHtml(osmDatesText(result.places, view.lang))}</p>${leftHtml}${renderOsmTally(result.places, view.lang)}<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0"><table class="gl-compare" data-gl-osm-places><caption>${escapeHtml(ui.caption)}</caption>` +
    `<thead><tr><th scope="col">${escapeHtml(ui.colPlace)}</th><th scope="col">${escapeHtml(ui.colRecords)}</th></tr></thead><tbody>${rows}</tbody></table></div>${more}${replaces}` +
    `${note}<div class="gl-actions"><button type="button" class="gl-btn" id="${OSM_IDS.add}">${escapeHtml(ui.add)}</button>${save}</div>`
  );
}

/** The panel: what it does, the tags it reads, the box, the button to check, and the outcome. */
export function renderOsmPanel(view: OsmResultView): string {
  const ui = OSM_UI[view.lang];
  return (
    `<p>${escapeHtml(ui.intro)}</p><p>${escapeHtml(ui.licence(OSM_SOURCE, OSM_LICENCE))}</p><p class="gl-note">${escapeHtml(ui.general)}</p><p class="gl-note">${escapeHtml(ui.formats)}</p>${renderOsmTags(view.lang)}` +
    `<label for="${OSM_IDS.text}">${escapeHtml(ui.textLabel)}</label><textarea id="${OSM_IDS.text}" class="gl-textarea" rows="6" spellcheck="false" autocomplete="off"></textarea>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${OSM_IDS.check}">${escapeHtml(ui.check)}</button></div>` +
    `<div data-gl-osm>${renderOsmResult(view)}</div>`
  );
}
