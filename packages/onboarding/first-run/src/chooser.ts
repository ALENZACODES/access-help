import { ARTICLES } from "./articles";
import { ONBOARDING_PATHS, type Localized } from "../../src/paths";

/**
 * "Find the right help": a short set of questions, one per screen, that ends
 * at an article or a short guide. It exists for people who do not know the
 * name of what they need, and for switch and voice users, who get one choice
 * list per screen instead of a long page to move through.
 *
 * The tree is data. validateTree() checks it, and the tests fail if a choice
 * points nowhere, a screen cannot be reached, or a leaf names a missing page.
 */
export type Leaf =
  | { readonly kind: "article"; readonly id: string }
  | { readonly kind: "path"; readonly id: string }
  | { readonly kind: "practice" | "names" };

export interface Choice {
  readonly label: Localized;
  /** Another question, or the page that answers this one. */
  readonly to: { readonly node: string } | Leaf;
}

export interface Question {
  readonly id: string;
  readonly prompt: Localized;
  readonly choices: readonly Choice[];
}

export const START_NODE = "start";

const q = (id: string, prompt: Localized, choices: Choice[]): Question => ({ id, prompt, choices });
const node = (id: string): Choice["to"] => ({ node: id });
const article = (id: string): Choice["to"] => ({ kind: "article", id });
const path = (id: string): Choice["to"] => ({ kind: "path", id });
const practice: Choice["to"] = { kind: "practice" };
const names: Choice["to"] = { kind: "names" };

/** Leaves that open a page of their own and so have no id to check. */
const isWholePage = (l: Leaf): l is Extract<Leaf, { kind: "practice" | "names" }> => l.kind === "practice" || l.kind === "names";

export const FIND_QUESTIONS: readonly Question[] = [
  q("start", { en: "What do you need help with?", fr: "De quoi avez-vous besoin\u202F?" }, [
    { label: { en: "Moving around without a mouse", fr: "Me déplacer sans souris" }, to: node("move") },
    { label: { en: "A detail that says Unknown", fr: "Un détail indiqué comme UNKNOWN" }, to: node("unknown") },
    { label: { en: "Writing a note about a place", fr: "Rédiger une note sur un lieu" }, to: node("note") },
    { label: { en: "Planning a visit", fr: "Planifier une visite" }, to: node("visit") },
    { label: { en: "Changing how the App looks", fr: "Changer l’apparence de l’App" }, to: article("display") },
    { label: { en: "Where my information is kept", fr: "Où mes renseignements sont conservés" }, to: article("data") },
  ]),
  q("move", { en: "How do you move around?", fr: "Comment vous déplacez-vous\u202F?" }, [
    { label: { en: "With a keyboard", fr: "Avec un clavier" }, to: node("keyboard") },
    { label: { en: "With a switch", fr: "Avec un contacteur" }, to: node("switch") },
    { label: { en: "With my voice", fr: "Avec ma voix" }, to: node("voice") },
    { label: { en: "I am not sure", fr: "Je ne sais pas" }, to: path("move-with-keyboard") },
  ]),
  q("keyboard", { en: "What do you want to do with the keyboard?", fr: "Que voulez-vous faire avec le clavier\u202F?" }, [
    { label: { en: "Learn which keys to use", fr: "Apprendre quelles touches utiliser" }, to: article("keyboard") },
    { label: { en: "Practice with buttons that do nothing", fr: "M’exercer avec des boutons qui ne font rien" }, to: practice },
  ]),
  q("switch", { en: "What do you want to know about switches?", fr: "Que voulez-vous savoir sur les contacteurs\u202F?" }, [
    { label: { en: "How to set up my switch", fr: "Comment configurer mon contacteur" }, to: path("move-with-switch") },
    { label: { en: "What the App does with a switch", fr: "Ce que l’App fait avec un contacteur" }, to: article("switch") },
  ]),
  q("voice", { en: "What do you want to know about voice control?", fr: "Que voulez-vous savoir sur la commande vocale\u202F?" }, [
    { label: { en: "How to use my device’s voice control", fr: "Comment utiliser la commande vocale de mon appareil" }, to: path("use-voice-control") },
    { label: { en: "What the App does with my voice", fr: "Ce que l’App fait avec ma voix" }, to: article("voice") },
    { label: { en: "See the names to say on a screen", fr: "Voir les noms à dire sur un écran" }, to: names },
  ]),
  q("note", { en: "What do you want to do with notes?", fr: "Que voulez-vous faire avec les notes\u202F?" }, [
    { label: { en: "Add a note", fr: "Ajouter une note" }, to: article("add-note") },
    { label: { en: "Keep or move my notes", fr: "Garder ou déplacer mes notes" }, to: article("data") },
    { label: { en: "Tidy my notes, step by step", fr: "Ranger mes notes, étape par étape" }, to: path("tidy-my-notes") },
    { label: { en: "Look at the records I have", fr: "Regarder les données que j’ai" }, to: node("records") },
    { label: { en: "Find out what a place’s details mean", fr: "Comprendre les détails d’un lieu" }, to: article("unknown") },
  ]),
  q("records", { en: "What do you want to check?", fr: "Que voulez-vous regarder\u202F?" }, [
    { label: { en: "Where my details come from", fr: "D’où viennent mes détails" }, to: path("check-the-sources") },
    { label: { en: "Details that may be out of date", fr: "Des détails peut-être dépassés" }, to: path("keep-details-current") },
    { label: { en: "Places I may have saved twice", fr: "Des lieux peut-être enregistrés deux fois" }, to: path("find-doubles") },
  ]),
  q("unknown", { en: "What do you want to know about Unknown?", fr: "Que voulez-vous savoir sur UNKNOWN\u202F?" }, [
    { label: { en: "What Unknown means", fr: "Ce que veut dire UNKNOWN" }, to: article("unknown") },
    { label: { en: "How to ask about it, step by step", fr: "Comment le demander, étape par étape" }, to: path("ask-about-unknown") },
  ]),
  q("visit", { en: "How do you want to plan?", fr: "Comment voulez-vous planifier\u202F?" }, [
    { label: { en: "Read how planning works", fr: "Lire comment fonctionne la planification" }, to: article("plan") },
    { label: { en: "Go step by step", fr: "Avancer étape par étape" }, to: path("plan-a-visit") },
  ]),
];

export function getQuestion(id: string): Question | undefined {
  return FIND_QUESTIONS.find((x) => x.id === id);
}

/** An address-safe question id: lowercase letters, digits and hyphens. */
export const NODE_ID = /^[a-z0-9-]{1,40}$/;

export function isLeaf(to: Choice["to"]): to is Leaf {
  return "kind" in to;
}

/** The question that leads to this one, or undefined for the first question. The first link found wins. */
export function parentOf(id: string): string | undefined {
  if (id === START_NODE) return undefined;
  const seen = new Set<string>([START_NODE]);
  const queue: string[] = [START_NODE];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const c of getQuestion(cur)?.choices ?? []) {
      if (isLeaf(c.to)) continue;
      if (c.to.node === id) return cur;
      if (!seen.has(c.to.node)) {
        seen.add(c.to.node);
        queue.push(c.to.node);
      }
    }
  }
  return undefined;
}

/** How many questions deep this one is. The first is 1. 0 means it cannot be reached. */
export function depthOf(id: string): number {
  let depth = 0;
  let cur: string | undefined = id;
  const guard = new Set<string>();
  while (cur !== undefined) {
    if (guard.has(cur)) return 0;
    guard.add(cur);
    depth++;
    if (cur === START_NODE) return depth;
    cur = parentOf(cur);
  }
  return 0;
}

function sameLeaf(a: Leaf, b: Leaf): boolean {
  if (isWholePage(a) || isWholePage(b)) return a.kind === b.kind;
  return a.kind === b.kind && a.id === b.id;
}

/** Every page the questions can end at. */
export function reachableLeaves(): Leaf[] {
  const out: Leaf[] = [];
  for (const question of FIND_QUESTIONS) {
    for (const c of question.choices) {
      const to = c.to;
      if (isLeaf(to) && !out.some((o) => sameLeaf(o, to))) out.push(to);
    }
  }
  return out;
}

export type TreeProblem = string;

/** Everything wrong with the tree, in plain words. An empty list means it is sound. */
export function validateTree(): TreeProblem[] {
  const problems: TreeProblem[] = [];
  const ids = FIND_QUESTIONS.map((x) => x.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate question id");
  if (!ids.includes(START_NODE)) problems.push("no start question");
  for (const question of FIND_QUESTIONS) {
    if (!NODE_ID.test(question.id)) problems.push(`${question.id}: id is not address-safe`);
    if (question.choices.length < 2) problems.push(`${question.id}: a question needs at least two choices`);
    for (const lang of ["en", "fr"] as const) {
      const labels = question.choices.map((c) => c.label[lang].trim().toLowerCase());
      if (new Set(labels).size !== labels.length) problems.push(`${question.id} (${lang}): two choices share a name`);
    }
    for (const c of question.choices) {
      const to = c.to;
      if (isLeaf(to)) {
        const found = isWholePage(to) ? true : to.kind === "article" ? ARTICLES.some((a) => a.id === to.id) : ONBOARDING_PATHS.some((p) => p.id === to.id);
        if (!found && !isWholePage(to)) problems.push(`${question.id}: ${to.kind} ${to.id} does not exist`);
      } else if (!getQuestion(to.node)) {
        problems.push(`${question.id}: points at missing question ${to.node}`);
      }
    }
  }
  for (const id of ids) if (depthOf(id) === 0) problems.push(`${id}: cannot be reached from the start`);
  return problems;
}

/** Strings for the copy audits, labelled like the article and path strings. */
export function chooserStrings(): Array<[string, Localized]> {
  const out: Array<[string, Localized]> = [];
  for (const question of FIND_QUESTIONS) {
    out.push([`chooser.${question.id}.prompt`, question.prompt]);
    question.choices.forEach((c, i) => out.push([`chooser.${question.id}.choice${i + 1}`, c.label]));
  }
  return out;
}
