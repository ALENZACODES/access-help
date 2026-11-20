import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';
import { ADVICE_KINDS, MAX_ADVICE_CHARS, adviceCounts, adviseWording, hasSpacingToFix, type Advice, type AdviceKind } from './wordingAdvice';

/**
 * "Check my wording": a small tool on the glossary page for a person who writes text for the
 * App. They type or paste text, and the tool lists the words the App does not use, with a plain
 * reason and what to write instead. In French it can also fix the spacing of the text. The text
 * never leaves the device, and the tool says plainly that it cannot tell whether a text is true.
 */
export const WORDINGCHECK_UI = {
  en: {
    heading: 'Check my wording',
    intro: 'Type or paste text to see which words the App does not use, and what to write instead. The text stays on this device.',
    label: 'Text to check',
    hint: (max: number): string => `Only the first ${max} characters are checked.`,
    check: 'Check the wording',
    clear: 'Clear the text',
    fix: 'Fix the French spacing',
    empty: 'Type some text first.',
    cleared: 'The text was cleared.',
    fixed: 'The French spacing was fixed.',
    nothingToFix: 'There was no French spacing to fix.',
    none: 'Nothing to change was found.',
    limits: 'This check looks for certain words and for long sentences. It cannot tell whether the text is true.',
    count: (n: number): string => (n === 1 ? 'There is 1 thing to look at.' : `There are ${n} things to look at.`),
    kinds: {
      word: 'Words the App does not use',
      claim: 'Claims about a place',
      sentence: 'Sentences and capital letters',
      plainer: 'Plainer words',
      spacing: 'French spacing',
      hidden: 'Characters that cannot be seen',
      language: 'Words from the other language',
    },
    found: (words: string): string => `Found: ${words}`,
    whole: 'In the text as a whole',
    resultsHeading: 'What the check found',
    save: 'Save this advice as text',
    title: 'Advice on wording',
    made: (date: string): string => `Made on ${date}.`,
  },
  fr: {
    heading: 'Contrôler ma formulation',
    intro: 'Saisissez ou collez un texte pour voir quels mots l’application n’utilise pas, et quoi écrire à la place. Le texte reste sur cet appareil.',
    label: 'Texte à contrôler',
    hint: (max: number): string => `Seuls les ${max} premiers caractères sont contrôlés.`,
    check: 'Contrôler la formulation',
    clear: 'Effacer le texte',
    fix: 'Corriger les espaces du français',
    empty: 'Saisissez d’abord un texte.',
    cleared: 'Le texte a été effacé.',
    fixed: 'Les espaces du français ont été corrigées.',
    nothingToFix: 'Il n’y avait aucune espace du français à corriger.',
    none: 'Rien à changer n’a été trouvé.',
    limits: 'Ce contrôle cherche certains mots et les phrases longues. Il ne peut pas dire si le texte est vrai.',
    count: (n: number): string => (n === 1 ? 'Il y a 1 élément à regarder.' : `Il y a ${n} éléments à regarder.`),
    kinds: {
      word: 'Mots que l’application n’utilise pas',
      claim: 'Affirmations au sujet d’un lieu',
      sentence: 'Phrases et majuscules',
      plainer: 'Mots plus simples',
      spacing: 'Espaces du français',
      hidden: 'Caractères qu’on ne peut pas voir',
      language: 'Mots de l’autre langue',
    },
    found: (words: string): string => `Trouvé\u00a0: ${words}`,
    whole: 'Dans l’ensemble du texte',
    resultsHeading: 'Ce que le contrôle a trouvé',
    save: 'Enregistrer ces conseils en texte',
    title: 'Conseils de formulation',
    made: (date: string): string => `Fait le ${date}.`,
  },
} as const;

export const WORDINGCHECK_IDS = { text: 'gl-wc-text', check: 'gl-wc-check', clear: 'gl-wc-clear', fix: 'gl-wc-fix', save: 'gl-wc-save' } as const;
export const WORDINGCHECK_MIME = 'text/plain;charset=utf-8';

export function wordingAdviceFilename(lang: Lang): string {
  return `wording-advice-${lang}.txt`;
}

/** A file the host can save: the same shape the place finder hands to its host. */
export interface WordingFile {
  readonly text: string;
  readonly filename: string;
  readonly mime: string;
}

/** The words an advice is about, cut short for display. */
export const MAX_FOUND_SHOWN = 120;

function foundText(advice: Advice, lang: Lang): string {
  const ui = WORDINGCHECK_UI[lang];
  if (advice.found === '') return ui.whole;
  const chars = Array.from(advice.found);
  const shown = chars.length > MAX_FOUND_SHOWN ? `${chars.slice(0, MAX_FOUND_SHOWN).join('')}\u2026` : advice.found;
  return ui.found(shown);
}

/** One line of plain text for an advice: what was found, why, and what to write. */
export function adviceLine(advice: Advice, lang: Lang): string {
  return `${foundText(advice, lang)}. ${advice.reason} ${advice.suggestion}`;
}

/**
 * The advice as plain text: a title, the day, the count, one line for each piece of advice, and
 * the note about what the check cannot do. The file holds the advice only. Of the person's text
 * it holds just the words each piece of advice is about.
 */
export function wordingAdviceText(advice: readonly Advice[], lang: Lang, today: string): string {
  const ui = WORDINGCHECK_UI[lang];
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (advice.length === 0) return `${head}\n${ui.none}\n${ui.limits}\n`;
  return `${head}\n${ui.count(advice.length)}\n\n${advice.map((a) => `- ${adviceLine(a, lang)}`).join('\n')}\n\n${ui.limits}\n`;
}

/**
 * The results: the count, then the advice grouped by kind under a heading for each kind that has
 * some. With no advice it says that nothing was found. The note about what the check cannot do
 * is always there.
 */
export function renderWordingResults(advice: readonly Advice[], lang: Lang): string {
  const ui = WORDINGCHECK_UI[lang];
  const limits = `<p class="gl-note">${escapeHtml(ui.limits)}</p>`;
  if (advice.length === 0) return `<p role="status">${escapeHtml(ui.none)}</p>${limits}`;
  const counts = adviceCounts(advice);
  const groups = ADVICE_KINDS.filter((kind) => counts[kind] > 0)
    .map((kind: AdviceKind) => {
      const items = advice
        .filter((a) => a.kind === kind)
        .map(
          (a) =>
            `<li data-rule="${escapeHtml(a.rule)}"><strong>${escapeHtml(foundText(a, lang))}</strong><br>${escapeHtml(a.reason)}<br>${escapeHtml(a.suggestion)}</li>`,
        )
        .join('');
      return `<h3>${escapeHtml(ui.kinds[kind])}</h3><ul class="gl-wc-list" data-kind="${kind}">${items}</ul>`;
    })
    .join('');
  return `<p role="status">${escapeHtml(ui.count(advice.length))}</p>${groups}${limits}`;
}

export interface WordingCheckView {
  readonly lang: Lang;
  /** The text in the box. */
  readonly text: string;
  /** The advice from the last check, or null when the text has not been checked yet. */
  readonly advice: readonly Advice[] | null;
  /** A short message about the last step, for example that the text was cleared. */
  readonly message: string;
  /** true when the host takes files: the advice can then be saved. */
  readonly canSave?: boolean;
}

/** The whole tool: the heading, the labelled box with its hint, the buttons, the message and the results. */
export function renderWordingCheck(view: WordingCheckView): string {
  const ui = WORDINGCHECK_UI[view.lang];
  const fix = view.lang === 'fr' ? `<button type="button" class="gl-btn" id="${WORDINGCHECK_IDS.fix}">${escapeHtml(ui.fix)}</button>` : '';
  const save =
    view.canSave === true && view.advice !== null && view.advice.length > 0
      ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${WORDINGCHECK_IDS.save}">${escapeHtml(ui.save)}</button></div>`
      : '';
  const results = view.advice === null ? '' : `<h2>${escapeHtml(ui.resultsHeading)}</h2>${renderWordingResults(view.advice, view.lang)}${save}`;
  return (
    `<section class="gl-wc" lang="${view.lang}-CA">` +
    `<p>${escapeHtml(ui.intro)}</p>` +
    `<label for="${WORDINGCHECK_IDS.text}">${escapeHtml(ui.label)}</label>` +
    `<textarea id="${WORDINGCHECK_IDS.text}" class="gl-input" rows="6" spellcheck="true" aria-describedby="gl-wc-hint">${escapeHtml(view.text)}</textarea>` +
    `<p class="gl-note" id="gl-wc-hint">${escapeHtml(ui.hint(MAX_ADVICE_CHARS))}</p>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${WORDINGCHECK_IDS.check}">${escapeHtml(ui.check)}</button>${fix}` +
    `<button type="button" class="gl-btn" id="${WORDINGCHECK_IDS.clear}">${escapeHtml(ui.clear)}</button></div>` +
    `<p role="status" data-gl-wc-msg>${escapeHtml(view.message)}</p>` +
    `<div data-gl-wc-out>${results}</div>` +
    `</section>`
  );
}

/** What the tool needs from a DOM element. HTMLElement satisfies it. */
export interface WordingElement {
  innerHTML: string;
  value?: string;
  focus?: () => void;
}

export interface WordingRoot {
  innerHTML: string;
  querySelector(selectors: string): WordingElement | null;
  addEventListener(type: string, listener: (event: { readonly target: unknown }) => void): void;
}

export interface WordingController {
  /** Draws the tool in another language. The text is kept; the advice is worked out again if there was some. */
  setLang(lang: Lang): void;
  getText(): string;
  getAdvice(): readonly Advice[] | null;
}

/**
 * Mounts the tool in `root`. Typing only updates what the tool remembers, so the box is never
 * redrawn under the person's hands. Pressing a button draws the tool again, puts the text back
 * in the box and moves the focus to the box.
 */
export interface WordingCheckOptions {
  readonly lang: Lang;
  /** Today as YYYY-MM-DD, written in a saved file. */
  readonly today?: string;
  /** Called with a file to save. When it is left out, the tool offers no saving. */
  readonly onExport?: (file: WordingFile) => void;
}

export function mountWordingCheck(root: WordingRoot, options: WordingCheckOptions): WordingController {
  let lang = options.lang;
  let text = '';
  let advice: readonly Advice[] | null = null;
  let message = '';

  function paint(focus: boolean): void {
    root.innerHTML = renderWordingCheck({ lang, text, advice, message, canSave: options.onExport !== undefined });
    const box = root.querySelector(`#${WORDINGCHECK_IDS.text}`);
    if (box !== null) {
      // A textarea keeps its own value once a person has typed in it, so the value is set as well as the markup.
      if ('value' in box) box.value = text;
      if (focus) box.focus?.();
    }
  }

  function readBox(): void {
    const box = root.querySelector(`#${WORDINGCHECK_IDS.text}`);
    if (box !== null && typeof box.value === 'string') text = box.value;
  }

  function check(): void {
    readBox();
    const ui = WORDINGCHECK_UI[lang];
    if (text.trim() === '') {
      advice = null;
      message = ui.empty;
    } else {
      advice = adviseWording(text, lang);
      message = advice.length === 0 ? ui.none : ui.count(advice.length);
    }
    paint(true);
  }

  function clear(): void {
    text = '';
    advice = null;
    message = WORDINGCHECK_UI[lang].cleared;
    paint(true);
  }

  function fix(): void {
    readBox();
    const ui = WORDINGCHECK_UI[lang];
    if (lang !== 'fr') return;
    if (text.trim() === '') {
      advice = null;
      message = ui.empty;
    } else if (!hasSpacingToFix(text)) {
      message = ui.nothingToFix;
    } else {
      text = fixFrench(text);
      advice = adviseWording(text, lang);
      message = ui.fixed;
    }
    paint(true);
  }

  root.addEventListener('input', (event) => {
    const t = event.target as { id?: unknown; value?: unknown } | null;
    if (t !== null && typeof t === 'object' && t.id === WORDINGCHECK_IDS.text && typeof t.value === 'string') text = t.value;
  });
  root.addEventListener('click', (event) => {
    const t = event.target as { id?: unknown } | null;
    if (t === null || typeof t !== 'object') return;
    if (t.id === WORDINGCHECK_IDS.check) check();
    else if (t.id === WORDINGCHECK_IDS.clear) clear();
    else if (t.id === WORDINGCHECK_IDS.fix) fix();
    else if (t.id === WORDINGCHECK_IDS.save && advice !== null && advice.length > 0) {
      options.onExport?.({ text: wordingAdviceText(advice, lang, options.today ?? ''), filename: wordingAdviceFilename(lang), mime: WORDINGCHECK_MIME });
    }
  });

  paint(false);

  return {
    setLang(next: Lang): void {
      if (next === lang) return;
      readBox();
      lang = next;
      advice = advice === null ? null : adviseWording(text, lang);
      message = '';
      paint(false);
    },
    getText: () => text,
    getAdvice: () => advice,
  };
}
