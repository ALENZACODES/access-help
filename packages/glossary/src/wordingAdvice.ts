import { CLAIM_RULE_IDS, lintClaims, type ClaimRuleId } from './claimRules';
import { COPY_RULE_IDS, lintCopy, type CopyRuleId } from './copyRules';
import { maskDataLabels } from './dataLabels';
import { hasInvisibleCharacters } from './deepScan';
import { FRENCH_RULES, fixFrench, frenchIssues, type FrenchRule } from './frTypography';
import { otherLanguageTerms } from './otherLanguageTerms';
import { plainLanguageIssues } from './plainLanguage';
import type { Lang } from './plainTerms';
import { plainSwaps } from './readability';

/**
 * Advice for a person who writes text for the App. For each thing the wording rules find, it
 * gives the words that were found, a plain reason, and what to write instead. The reasons never
 * use the words they are about. The advice is a help for writing; it cannot tell whether a text
 * is true, and it says so.
 */
export type AdviceKind = 'word' | 'claim' | 'hidden' | 'sentence' | 'plainer' | 'spacing' | 'language';

/** The kinds in the order the advice is given and shown. */
export const ADVICE_KINDS: readonly AdviceKind[] = ['word', 'claim', 'hidden', 'sentence', 'plainer', 'spacing', 'language'];

export interface Advice {
  readonly kind: AdviceKind;
  /** The rule that found it, for example "no-partnership-claim" or "long-sentence". */
  readonly rule: string;
  /** The words of the text it is about, as written. Empty when it is about the text as a whole. */
  readonly found: string;
  readonly reason: string;
  readonly suggestion: string;
}

type RuleAdvice = { readonly reason: string; readonly suggestion: string };

export const ADVICE_UI = {
  en: {
    words: {
      'no-verification-claim': { reason: 'This word says that someone has confirmed or promised something. The App only reports what a source says.', suggestion: 'Say what the source reports, and give its date.' },
      'no-realtime-claim': { reason: 'This wording says the information changes as things happen. The App shows records with a date.', suggestion: 'Give the date of the record.' },
      'no-partnership-claim': { reason: 'This wording says the App works together with an organisation. The App names its sources and nothing more.', suggestion: 'Name the source of the information.' },
      'no-conformance-claim': { reason: 'This wording says that something follows a set of rules for access. The App does not judge that.', suggestion: 'Describe the feature that a source reports.' },
      'no-ai-mention': { reason: 'This wording names a kind of software that the App does not talk about.', suggestion: 'Leave it out. Say what the tool does in plain words.' },
      'no-medical-advice': { reason: 'This wording tells a person what care to get. The App gives general information only.', suggestion: 'Leave it out, or say where general information can be found.' },
      'no-eligibility-claim': { reason: 'This wording tells a person that they can get a service. Only the service can decide that.', suggestion: 'Say who to ask, and let the service decide.' },
    } satisfies Record<CopyRuleId, RuleAdvice>,
    claims: {
      'no-absolute-accessible': { reason: 'This wording says that a person can use the whole place. The App reports features, one at a time.', suggestion: 'Name the feature and what the source reports.' },
      'no-barrier-free': { reason: 'This wording says that nothing is in the way. No record can show that.', suggestion: 'Name each feature that a source reports.' },
      'no-inferred-accessible': { reason: 'This wording guesses. The App never guesses about a place.', suggestion: 'Say what is reported, or say that it is unknown.' },
      'no-safety-claim': { reason: 'This wording promises that a person will come to no harm. The App cannot know that.', suggestion: 'Describe the feature and leave the judgment to the person.' },
      'no-suitability-claim': { reason: 'This wording says that a place fits a person. Only the person can decide that.', suggestion: 'Describe the feature and let the person decide.' },
      'no-outcome-promise': { reason: 'This wording promises what will happen at the place. The App cannot promise that.', suggestion: 'Say what the source reports, and suggest asking the place.' },
      'no-freshness-claim': { reason: 'This wording says the information is new. A record is only as new as its date.', suggestion: 'Give the date of the record.' },
      'no-official-claim': { reason: 'This wording says that an authority stands behind the information.', suggestion: 'Name the source and its licence.' },
      'no-universal-claim': { reason: 'This wording speaks for all people. People differ, and so do their needs.', suggestion: 'Describe the feature and let each person decide.' },
      'no-code-compliance-claim': { reason: 'This wording says that a place follows a law or a building rule. The App does not judge that.', suggestion: 'Describe the feature that a source reports.' },
    } satisfies Record<ClaimRuleId, RuleAdvice>,
    spacing: {
      'straight-apostrophe': 'A straight apostrophe is used. French text uses the curved one.',
      'guillemet-spacing': 'French quotation marks need a thin space inside them.',
      'colon-spacing': 'A colon needs a space before it in French.',
      'high-punctuation-spacing': 'A semicolon, an exclamation mark or a question mark needs a thin space before it in French.',
    } satisfies Record<FrenchRule, string>,
    spacingFix: 'Press the button that fixes the French spacing.',
    longSentence: (words: number): string => `This sentence has ${words} words. Short sentences are easier to read.`,
    longSentenceFix: (max: number): string => `Use sentences of ${max} words or fewer.`,
    allCaps: 'This word is all in capital letters. That is harder to read.',
    allCapsFix: 'Write it in lower-case letters.',
    plainer: 'A shorter word says the same thing.',
    plainerFix: (use: string): string => `Write “${use}” in its place.`,
    hidden: 'The text holds characters that cannot be seen.',
    hiddenFix: 'Type the text again, or paste it as plain text.',
    otherLanguage: 'This is the French word in the App’s list of terms.',
    otherLanguageFix: (use: string): string => `In English, the App says “${use}”.`,
  },
  fr: {
    words: {
      'no-verification-claim': { reason: 'Ce mot dit que quelqu’un a confirmé ou promis quelque chose. L’application rapporte seulement ce que dit une source.', suggestion: 'Dites ce que la source signale, et donnez sa date.' },
      'no-realtime-claim': { reason: 'Cette formulation dit que l’information change au fil des événements. L’application montre des fiches avec une date.', suggestion: 'Donnez la date de la fiche.' },
      'no-partnership-claim': { reason: 'Cette formulation dit que l’application travaille de concert avec un organisme. L’application nomme ses sources, rien de plus.', suggestion: 'Nommez la source de l’information.' },
      'no-conformance-claim': { reason: 'Cette formulation dit que quelque chose suit un ensemble de règles d’accès. L’application ne juge pas cela.', suggestion: 'Décrivez la caractéristique qu’une source signale.' },
      'no-ai-mention': { reason: 'Cette formulation nomme un type de logiciel dont l’application ne parle pas.', suggestion: 'Retirez-la. Dites en mots simples ce que fait l’outil.' },
      'no-medical-advice': { reason: 'Cette formulation dit à une personne quels soins obtenir. L’application donne seulement des renseignements généraux.', suggestion: 'Retirez-la, ou dites où trouver des renseignements généraux.' },
      'no-eligibility-claim': { reason: 'Cette formulation dit à une personne qu’elle peut obtenir un service. Seul le service peut le décider.', suggestion: 'Dites à qui demander, et laissez le service décider.' },
    } satisfies Record<CopyRuleId, RuleAdvice>,
    claims: {
      'no-absolute-accessible': { reason: 'Cette formulation dit qu’une personne peut utiliser tout le lieu. L’application signale des caractéristiques, une à la fois.', suggestion: 'Nommez la caractéristique et ce que la source signale.' },
      'no-barrier-free': { reason: 'Cette formulation dit que rien ne gêne le passage. Aucune fiche ne peut le montrer.', suggestion: 'Nommez chaque caractéristique qu’une source signale.' },
      'no-inferred-accessible': { reason: 'Cette formulation devine. L’application ne devine jamais au sujet d’un lieu.', suggestion: 'Dites ce qui est signalé, ou dites que c’est UNKNOWN.' },
      'no-safety-claim': { reason: 'Cette formulation promet qu’il n’arrivera aucun mal à une personne. L’application ne peut pas le savoir.', suggestion: 'Décrivez la caractéristique et laissez le jugement à la personne.' },
      'no-suitability-claim': { reason: 'Cette formulation dit qu’un lieu va bien à une personne. Seule la personne peut le décider.', suggestion: 'Décrivez la caractéristique et laissez la personne décider.' },
      'no-outcome-promise': { reason: 'Cette formulation promet ce qui se passera au lieu. L’application ne peut pas le promettre.', suggestion: 'Dites ce que la source signale, et suggérez de demander au lieu.' },
      'no-freshness-claim': { reason: 'Cette formulation dit que l’information est nouvelle. Une fiche est aussi nouvelle que sa date, pas plus.', suggestion: 'Donnez la date de la fiche.' },
      'no-official-claim': { reason: 'Cette formulation dit qu’une autorité appuie l’information.', suggestion: 'Nommez la source et sa licence.' },
      'no-universal-claim': { reason: 'Cette formulation parle au nom de toutes les personnes. Les personnes diffèrent, et leurs besoins aussi.', suggestion: 'Décrivez la caractéristique et laissez chaque personne décider.' },
      'no-code-compliance-claim': { reason: 'Cette formulation dit qu’un lieu suit une loi ou une règle de construction. L’application ne juge pas cela.', suggestion: 'Décrivez la caractéristique qu’une source signale.' },
    } satisfies Record<ClaimRuleId, RuleAdvice>,
    spacing: {
      'straight-apostrophe': 'Une apostrophe droite est utilisée. Le texte français utilise l’apostrophe courbe.',
      'guillemet-spacing': 'Les guillemets français veulent une espace fine à l’intérieur.',
      'colon-spacing': 'En français, le deux-points veut une espace avant lui.',
      'high-punctuation-spacing': 'En français, un point-virgule, un point d’exclamation ou un point d’interrogation veut une espace fine avant lui.',
    } satisfies Record<FrenchRule, string>,
    spacingFix: 'Appuyez sur le bouton qui corrige les espaces du français.',
    longSentence: (words: number): string => `Cette phrase compte ${words} mots. Les phrases courtes sont plus faciles à lire.`,
    longSentenceFix: (max: number): string => `Faites des phrases de ${max} mots ou moins.`,
    allCaps: 'Ce mot est tout en majuscules. C’est plus difficile à lire.',
    allCapsFix: 'Écrivez-le en minuscules.',
    plainer: 'Un mot plus court dit la même chose.',
    plainerFix: (use: string): string => `Écrivez «\u202f${use}\u202f» à sa place.`,
    hidden: 'Le texte contient des caractères qu’on ne peut pas voir.',
    hiddenFix: 'Saisissez le texte de nouveau, ou collez-le en texte brut.',
    otherLanguage: 'C’est le mot anglais dans la liste de termes de l’application.',
    otherLanguageFix: (use: string): string => `En français, l’application dit «\u202f${use}\u202f».`,
  },
} as const;

export const MAX_SENTENCE_WORDS = 20;
/** Text past this length is not looked at, so a very long paste cannot stall the page. */
export const MAX_ADVICE_CHARS = 5000;

/** true when French spacing or apostrophes in the text can be fixed by fixFrench. */
export function hasSpacingToFix(text: string): boolean {
  return fixFrench(text) !== text;
}

/**
 * Everything the wording rules find in a text, with a reason and a suggestion for each, in a
 * fixed order: words the App does not use, claims about places, hidden characters, sentences,
 * plainer words, French spacing, then words from the other language. The same words under the
 * same rule are given once. Data labels are set aside first.
 */
export function adviseWording(input: string, lang: Lang): readonly Advice[] {
  const text = input.slice(0, MAX_ADVICE_CHARS);
  if (text.trim() === '') return [];
  const ui = ADVICE_UI[lang];
  const checked = maskDataLabels(text);
  const out: Advice[] = [];
  const seen = new Set<string>();
  const add = (advice: Advice): void => {
    const key = `${advice.rule}\u0000${advice.found.toLocaleLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(advice);
  };
  for (const v of lintCopy(checked)) add({ kind: 'word', rule: v.rule, found: v.match, ...ui.words[v.rule] });
  for (const v of lintClaims(checked)) add({ kind: 'claim', rule: v.rule, found: v.match, ...ui.claims[v.rule] });
  if (hasInvisibleCharacters(text)) add({ kind: 'hidden', rule: 'hidden-characters', found: '', reason: ui.hidden, suggestion: ui.hiddenFix });
  for (const issue of plainLanguageIssues(checked)) {
    if (issue.rule === 'long-sentence') {
      add({ kind: 'sentence', rule: 'long-sentence', found: issue.text.trim(), reason: ui.longSentence(issue.words), suggestion: ui.longSentenceFix(MAX_SENTENCE_WORDS) });
    } else {
      add({ kind: 'sentence', rule: 'all-caps-word', found: issue.text, reason: ui.allCaps, suggestion: ui.allCapsFix });
    }
  }
  for (const swap of plainSwaps(checked, lang)) add({ kind: 'plainer', rule: 'plain-swap', found: swap.found, reason: ui.plainer, suggestion: ui.plainerFix(swap.use) });
  if (lang === 'fr') {
    for (const rule of frenchIssues(text)) add({ kind: 'spacing', rule, found: '', reason: ui.spacing[rule], suggestion: ui.spacingFix });
  }
  for (const term of otherLanguageTerms(checked, lang)) {
    add({ kind: 'language', rule: `other-language:${term.termId}`, found: term.found, reason: ui.otherLanguage, suggestion: ui.otherLanguageFix(term.use) });
  }
  return out;
}

/** How many pieces of advice there are of each kind. */
export function adviceCounts(advice: readonly Advice[]): Readonly<Record<AdviceKind, number>> {
  const counts = Object.fromEntries(ADVICE_KINDS.map((k) => [k, 0])) as Record<AdviceKind, number>;
  for (const a of advice) counts[a.kind] += 1;
  return counts;
}

/** The rule ids that have advice of their own. Every wording rule and every claim rule must be among them. */
export function advisedRules(): readonly string[] {
  return [...COPY_RULE_IDS, ...CLAIM_RULE_IDS, ...FRENCH_RULES, 'long-sentence', 'all-caps-word', 'plain-swap', 'hidden-characters'];
}
