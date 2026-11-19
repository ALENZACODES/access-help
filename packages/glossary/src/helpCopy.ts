import { fixFrench } from './frTypography';
import { TERMS, type Lang } from './plainTerms';

/**
 * Help and outing copy, EN + FR. Each topic has a title and short paragraphs. `[[term-id]]` or
 * `[[term-id|words]]` links to the glossary entry for that feature. The text says what sources
 * report and what to do next. It never says a place is accessible and it gives no advice about health.
 */
export type HelpKind = 'about' | 'how-to' | 'limits';

export interface HelpTopic {
  readonly id: string;
  readonly kind: HelpKind;
  readonly title: Readonly<Record<Lang, string>>;
  readonly body: Readonly<Record<Lang, readonly string[]>>;
}

const featureList = TERMS.map((t) => `[[${t.id}]]`).join(', ');

interface RawTopic {
  readonly id: string;
  readonly kind: HelpKind;
  readonly title: Readonly<Record<Lang, string>>;
  readonly body: Readonly<Record<Lang, readonly string[]>>;
}

const RAW: readonly RawTopic[] = [
  {
    id: 'unknown',
    kind: 'about',
    title: { en: 'What “Unknown” means', fr: 'Ce que veut dire « Inconnu »' },
    body: {
      en: ['Unknown means we have no information.', 'It does not mean a feature is there. It does not mean it is missing.'],
      fr: ['Inconnu veut dire que nous n’avons pas d’information.', 'Cela ne veut pas dire qu’une fonction est présente. Cela ne veut pas dire qu’elle est absente.'],
    },
  },
  {
    id: 'sources',
    kind: 'about',
    title: { en: 'Where the information comes from', fr: 'D’où vient l’information' },
    body: {
      en: [
        'Each answer comes from a source.',
        'We show the source, its licence and its date.',
        'An answer with no valid source, open licence and date is shown as Unknown.',
      ],
      fr: [
        'Chaque réponse vient d’une source.',
        'Nous indiquons la source, sa licence et sa date.',
        'Une réponse sans source, sans licence ouverte et sans date valides est affichée comme Inconnu.',
      ],
    },
  },
  {
    id: 'age',
    kind: 'about',
    title: { en: 'How old is the information?', fr: 'Quel âge a l’information?' },
    body: {
      en: ['We note when a source is more than a year old.', 'Older information may have changed.', 'Ask the place before you go.'],
      fr: ['Nous signalons quand une source a plus d’un an.', 'Une information plus ancienne a peut-être changé.', 'Posez la question au lieu avant de vous déplacer.'],
    },
  },
  {
    id: 'disagree',
    kind: 'about',
    title: { en: 'When sources disagree', fr: 'Quand les sources ne concordent pas' },
    body: {
      en: ['Sometimes two sources give different answers.', 'We then say that the sources disagree.', 'The feature is shown as Unknown.'],
      fr: ['Parfois, deux sources donnent des réponses différentes.', 'Nous indiquons alors que les sources ne concordent pas.', 'La caractéristique est affichée comme Inconnu.'],
    },
  },
  {
    id: 'features',
    kind: 'how-to',
    title: { en: 'Choosing features', fr: 'Choisir des caractéristiques' },
    body: {
      en: [
        'Choose the features that matter to you, such as [[ramp|a ramp]] or [[elevator|an elevator]].',
        'Places are listed by what their sources report.',
        'The order is not a rating of a place.',
      ],
      fr: [
        'Choisissez les caractéristiques importantes pour vous, comme [[ramp|une rampe]] ou [[elevator|un ascenseur]].',
        'Les lieux sont classés selon ce que leurs sources indiquent.',
        'L’ordre n’est pas une note donnée à un lieu.',
      ],
    },
  },
  {
    id: 'questions',
    kind: 'how-to',
    title: { en: 'Questions to ask a place', fr: 'Questions à poser à un lieu' },
    body: {
      en: [
        'For each feature that is Unknown, old or in dispute, we suggest a question.',
        'Ask the place before you go.',
        'The tick boxes in your visit plan are only your own record.',
      ],
      fr: [
        'Pour chaque caractéristique UNKNOWN, ancienne ou contestée, nous proposons une question.',
        'Posez-la au lieu avant de vous déplacer.',
        'Les cases à cocher de votre plan de visite ne sont que votre propre registre.',
      ],
    },
  },
  {
    id: 'outing',
    kind: 'how-to',
    title: { en: 'Planning an outing', fr: 'Planifier une sortie' },
    body: {
      en: [
        'Choose the features that matter to you.',
        'Save the places you like.',
        'Open your visit plan and ask the questions.',
        'Write what you learn in your notes.',
      ],
      fr: [
        'Choisissez les caractéristiques importantes pour vous.',
        'Enregistrez les lieux qui vous intéressent.',
        'Ouvrez votre plan de visite et posez les questions.',
        'Écrivez ce que vous apprenez dans vos notes.',
      ],
    },
  },
  {
    id: 'compare',
    kind: 'how-to',
    title: { en: 'Comparing two places', fr: 'Comparer deux lieux' },
    body: {
      en: ['Choose two places to see them side by side.', 'Each feature shows what the sources report for each place.'],
      fr: ['Choisissez deux lieux pour les voir côte à côte.', 'Chaque caractéristique montre ce que les sources indiquent pour chaque lieu.'],
    },
  },
  {
    id: 'saved',
    kind: 'how-to',
    title: { en: 'Saved places and notes', fr: 'Lieux enregistrés et notes' },
    body: {
      en: ['Saved places, notes and ticks stay on this device.', 'You can copy them as text to keep them elsewhere.'],
      fr: ['Les lieux enregistrés, les notes et les coches restent sur cet appareil.', 'Vous pouvez les copier en texte pour les garder ailleurs.'],
    },
  },
  {
    id: 'offline',
    kind: 'how-to',
    title: { en: 'Using the page offline', fr: 'Utiliser la page hors ligne' },
    body: {
      en: [
        'The glossary and your saved information stay available without a connection.',
        'When you are offline, the page says so.',
        'New place data needs a connection.',
      ],
      fr: [
        'Le glossaire et vos informations enregistrées restent disponibles sans connexion.',
        'Hors ligne, la page vous l’indique.',
        'De nouvelles données sur les lieux demandent une connexion.',
      ],
    },
  },
  {
    id: 'display',
    kind: 'how-to',
    title: { en: 'Display settings', fr: 'Paramètres d’affichage' },
    body: {
      en: ['You can make the text larger, widen the spacing, raise the contrast and reduce motion.', 'Your choices stay on this device.'],
      fr: ['Vous pouvez agrandir le texte, élargir l’espacement, augmenter le contraste et réduire les animations.', 'Vos choix restent sur cet appareil.'],
    },
  },
  {
    id: 'terms',
    kind: 'about',
    title: { en: 'Words used here', fr: 'Mots utilisés ici' },
    body: {
      en: ['The glossary explains each feature in plain words.', `Features: ${featureList}.`],
      fr: ['Le glossaire explique chaque caractéristique en mots simples.', `Caractéristiques : ${featureList}.`],
    },
  },
  {
    id: 'language',
    kind: 'how-to',
    title: { en: 'Language', fr: 'Langue' },
    body: {
      en: ['Switch between English and French at any time.', 'Place names stay as the source wrote them.'],
      fr: ['Passez de l’anglais au français à tout moment.', 'Les noms de lieux restent tels que la source les a écrits.'],
    },
  },
  {
    id: 'limits',
    kind: 'limits',
    title: { en: 'What this page does not do', fr: 'Ce que cette page ne fait pas' },
    body: {
      en: [
        'This page shows what sources report about places.',
        'It is not medical or eligibility advice.',
        'It does not say who may use a service.',
        'It does not book or reserve anything.',
        'It does not give a place an overall rating.',
      ],
      fr: [
        'Cette page montre ce que les sources indiquent sur les lieux.',
        'Ce n’est pas un avis médical ni d’admissibilité.',
        'Elle ne dit pas qui peut utiliser un service.',
        'Elle ne réserve rien.',
        'Elle ne donne pas de note globale à un lieu.',
      ],
    },
  },
];

/** The topics, with French typography already applied. */
export const HELP_TOPICS: readonly HelpTopic[] = RAW.map((t) => ({
  id: t.id,
  kind: t.kind,
  title: { en: t.title.en, fr: fixFrench(t.title.fr) },
  body: { en: t.body.en, fr: t.body.fr.map((p) => fixFrench(p)) },
}));

export function helpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}

/** All help strings for one language, with where each came from. Used by the audit and the tests. */
export function helpStrings(lang: Lang): readonly { readonly where: string; readonly text: string }[] {
  return HELP_TOPICS.flatMap((t) => [
    { where: `help.${t.id}.title`, text: t.title[lang] },
    ...t.body[lang].map((text, i) => ({ where: `help.${t.id}.${i}`, text })),
  ]);
}
