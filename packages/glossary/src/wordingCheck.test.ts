import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  MAX_ADVICE_CHARS,
  MAX_FOUND_SHOWN,
  WORDINGCHECK_IDS,
  WORDINGCHECK_MIME,
  WORDINGCHECK_UI,
  adviceLine,
  adviseWording,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  mountWordingCheck,
  plainLanguageIssues,
  readabilityIssues,
  renderWordingCheck,
  renderWordingResults,
  wordingAdviceFilename,
  wordingAdviceText,
  type Lang,
  type WordingFile,
} from './index';

class El {
  innerHTML = '';
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}

class Root {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, ((event: { readonly target: unknown }) => void)[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, listener: (event: { readonly target: unknown }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
}

const mount = (lang: Lang = 'en') => {
  const root = new Root();
  const tool = mountWordingCheck(root, { lang });
  const box = root.querySelector('#gl-wc-text');
  const type = (text: string): void => {
    box.value = text;
    root.fire('input', { id: 'gl-wc-text', value: text });
  };
  const press = (id: string): void => root.fire('click', { id });
  return { root, tool, box, type, press };
};

describe('renderWordingResults', () => {
  it('says so when nothing was found, and what the check cannot do', () => {
    expect(renderWordingResults([], 'en')).toBe(
      '<p role="status">Nothing to change was found.</p><p class="gl-note">This check looks for certain words and for long sentences. It cannot tell whether the text is true.</p>',
    );
    expect(renderWordingResults([], 'fr')).toContain('Il ne peut pas dire si le texte est vrai.');
  });
  it('gives the count and groups the advice by kind under a heading', () => {
    const html = renderWordingResults(adviseWording('Verified by a partner. This place is safe to enter.', 'en'), 'en');
    expect(html).toContain('<p role="status">There are 3 things to look at.</p>');
    expect(html).toContain('<h3>Words the App does not use</h3><ul class="gl-wc-list" data-kind="word">');
    expect(html).toContain('<h3>Claims about a place</h3><ul class="gl-wc-list" data-kind="claim">');
    expect(html.indexOf('data-kind="word"')).toBeLessThan(html.indexOf('data-kind="claim"'));
    expect(html).not.toContain('data-kind="spacing"');
    expect(html).toContain('It cannot tell whether the text is true.');
  });
  it('shows what was found, the reason and what to write', () => {
    const html = renderWordingResults(adviseWording('Verified by the city.', 'en'), 'en');
    expect(html).toContain('<p role="status">There is 1 thing to look at.</p>');
    expect(html).toContain(
      '<li data-rule="no-verification-claim"><strong>Found: Verified</strong><br>This word says that someone has confirmed or promised something. The App only reports what a source says.<br>Say what the source reports, and give its date.</li>',
    );
  });
  it('says an advice is about the text as a whole when it has no words of its own', () => {
    const html = renderWordingResults(adviseWording("L'entrée est ici.", 'fr'), 'fr');
    expect(html).toContain('<h3>Espaces du français</h3>');
    expect(html).toContain('<strong>Dans l’ensemble du texte</strong>');
  });
  it('escapes the text of the person', () => {
    const html = renderWordingResults(adviseWording('A <b>verified</b> & "official" list', 'en'), 'en');
    expect(html).not.toContain('<b>');
    expect(html).toContain('Found: verified');
    const long = renderWordingResults(adviseWording(`<i>${Array.from({ length: 24 }, () => 'word').join(' ')}</i>.`, 'en'), 'en');
    expect(long).toContain('&lt;i&gt;word');
    expect(long).not.toContain('<i>');
  });
  it('cuts a very long passage short', () => {
    const sentence = `${Array.from({ length: 60 }, () => 'word').join(' ')}.`;
    const html = renderWordingResults(adviseWording(sentence, 'en'), 'en');
    expect(html).toContain('\u2026</strong>');
    expect(html).not.toContain(sentence);
    expect(MAX_FOUND_SHOWN).toBeLessThan(sentence.length);
  });
  it('writes an advice as one line of text', () => {
    const [advice] = adviseWording('Verified by the city.', 'en');
    expect(advice && adviceLine(advice, 'en')).toBe(
      'Found: Verified. This word says that someone has confirmed or promised something. The App only reports what a source says. Say what the source reports, and give its date.',
    );
    const [fr] = adviseWording('Vérifié par la ville.', 'fr');
    expect(fr && adviceLine(fr, 'fr')).toContain('Trouvé\u00a0: Vérifié. Ce mot dit que');
  });
});

describe('renderWordingCheck', () => {
  const view = (o: Partial<Parameters<typeof renderWordingCheck>[0]> = {}): string => renderWordingCheck({ lang: 'en', text: '', advice: null, message: '', ...o });
  it('has a labelled box with a hint, the buttons, a message region and an empty results region', () => {
    const html = view();
    expect(html.startsWith('<section class="gl-wc" lang="en-CA"><p>Type or paste text to see which words the App does not use')).toBe(true);
    expect(html).toContain(`<label for="${WORDINGCHECK_IDS.text}">Text to check</label><textarea id="${WORDINGCHECK_IDS.text}" class="gl-input" rows="6" spellcheck="true" aria-describedby="gl-wc-hint"></textarea>`);
    expect(html).toContain(`<p class="gl-note" id="gl-wc-hint">Only the first ${MAX_ADVICE_CHARS} characters are checked.</p>`);
    expect(html).toContain(`id="${WORDINGCHECK_IDS.check}">Check the wording</button>`);
    expect(html).toContain(`id="${WORDINGCHECK_IDS.clear}">Clear the text</button>`);
    expect(html).toContain('<p role="status" data-gl-wc-msg></p><div data-gl-wc-out></div></section>');
  });
  it('offers to fix the French spacing in French only', () => {
    expect(view()).not.toContain(WORDINGCHECK_IDS.fix);
    expect(view({ lang: 'fr' })).toContain(`id="${WORDINGCHECK_IDS.fix}">Corriger les espaces du français</button>`);
  });
  it('puts the text in the box, escaped', () => {
    expect(view({ text: 'a <b> & "c"' })).toContain('aria-describedby="gl-wc-hint">a &lt;b&gt; &amp; &quot;c&quot;</textarea>');
  });
  it('shows the results under a heading once the text was checked', () => {
    expect(view({ advice: [] })).toContain('<div data-gl-wc-out><h2>What the check found</h2><p role="status">Nothing to change was found.</p>');
    expect(view({ advice: adviseWording('Verified.', 'en'), message: 'There is 1 thing to look at.' })).toContain('<p role="status" data-gl-wc-msg>There is 1 thing to look at.</p>');
  });
  it('says the text stays on the device', () => {
    expect(view()).toContain('The text stays on this device.');
    expect(view({ lang: 'fr' })).toContain('Le texte reste sur cet appareil.');
  });
  it('passes the HTML audit in both languages, with and without results', () => {
    for (const lang of ['en', 'fr'] as const) {
      const text = lang === 'fr' ? "Vérifié: l'entrée est entièrement accessible!" : 'Verified: this place is fully accessible for everyone.';
      for (const advice of [null, [], adviseWording(text, lang)]) {
        const html = `<div lang="${lang}"><h1>t</h1>${renderWordingCheck({ lang, text, advice, message: 'm' })}</div>`;
        expect(auditHtml(html, 'tool').filter((f) => f.rule !== 'copy-rule'), `${lang} ${advice?.length ?? 'none'}`).toEqual([]);
      }
    }
  });
});

describe('mountWordingCheck', () => {
  it('draws the tool with an empty box and no results', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('<div data-gl-wc-out></div>');
    expect(m.tool.getText()).toBe('');
    expect(m.tool.getAdvice()).toBeNull();
    expect([...m.root.handlers.keys()].sort()).toEqual(['click', 'input']);
  });
  it('does not redraw while the person types', () => {
    const m = mount();
    const before = m.root.innerHTML;
    m.type('Verified by the city.');
    expect(m.root.innerHTML).toBe(before);
    expect(m.tool.getText()).toBe('Verified by the city.');
  });
  it('checks the text when the button is pressed, keeps the text, and moves the focus to the box', () => {
    const m = mount();
    m.type('Verified by the city.');
    m.press('gl-wc-check');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-wc-msg>There is 1 thing to look at.</p>');
    expect(m.root.innerHTML).toContain('<strong>Found: Verified</strong>');
    expect(m.root.innerHTML).toContain('>Verified by the city.</textarea>');
    expect(m.box.value).toBe('Verified by the city.');
    expect(m.box.focused).toBe(1);
    expect(m.tool.getAdvice()).toHaveLength(1);
  });
  it('reads the box itself, so text put there without typing is checked too', () => {
    const m = mount();
    m.box.value = 'A partnership with the city.';
    m.press('gl-wc-check');
    expect(m.root.innerHTML).toContain('Found: partnership');
  });
  it('says so when nothing was found', () => {
    const m = mount();
    m.type('One source reports a ramp. The record is dated 2026-06-01.');
    m.press('gl-wc-check');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-wc-msg>Nothing to change was found.</p>');
    expect(m.root.innerHTML).toContain('It cannot tell whether the text is true.');
    expect(m.tool.getAdvice()).toEqual([]);
  });
  it('asks for text when the box is empty', () => {
    const m = mount();
    m.type('   ');
    m.press('gl-wc-check');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-wc-msg>Type some text first.</p>');
    expect(m.root.innerHTML).toContain('<div data-gl-wc-out></div>');
    expect(m.tool.getAdvice()).toBeNull();
  });
  it('clears the text and the results', () => {
    const m = mount();
    m.type('Verified.');
    m.press('gl-wc-check');
    m.press('gl-wc-clear');
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-wc-msg>The text was cleared.</p>');
    expect(m.root.innerHTML).toContain('aria-describedby="gl-wc-hint"></textarea>');
    expect(m.root.innerHTML).toContain('<div data-gl-wc-out></div>');
    expect(m.box.value).toBe('');
    expect(m.tool.getText()).toBe('');
    expect(m.box.focused).toBe(2);
  });
  it('fixes the French spacing in the box and checks the text again', () => {
    const m = mount('fr');
    m.type("L'entrée: ouverte! «Oui»");
    m.press('gl-wc-fix');
    expect(m.box.value).toBe('L’entrée\u00a0: ouverte\u202f! «\u202fOui\u202f»');
    expect(m.tool.getText()).toBe(m.box.value);
    expect(frenchIssues(m.box.value)).toEqual([]);
    expect(m.root.innerHTML).toContain('<p role="status" data-gl-wc-msg>Les espaces du français ont été corrigées.</p>');
    expect(m.root.innerHTML).toContain('Rien à changer n’a été trouvé.');
    expect(m.tool.getAdvice()).toEqual([]);
  });
  it('changes only the spacing: the words stay as the person wrote them', () => {
    const m = mount('fr');
    m.type("Vérifié: l'entrée est ici!");
    m.press('gl-wc-fix');
    expect(m.box.value).toBe('Vérifié\u00a0: l’entrée est ici\u202f!');
    expect(m.root.innerHTML).toContain('<strong>Trouvé\u00a0: Vérifié</strong>');
  });
  it('says so when there is no spacing to fix, and when the box is empty', () => {
    const m = mount('fr');
    m.type('Une rampe est signalée.');
    m.press('gl-wc-fix');
    expect(m.root.innerHTML).toContain('Il n’y avait aucune espace du français à corriger.');
    expect(m.box.value).toBe('Une rampe est signalée.');
    m.type('');
    m.press('gl-wc-fix');
    expect(m.root.innerHTML).toContain('Saisissez d’abord un texte.');
  });
  it('does not fix spacing in English, where there is no such button', () => {
    const m = mount('en');
    m.type("It's here: open!");
    const before = m.root.innerHTML;
    m.press('gl-wc-fix');
    expect(m.root.innerHTML).toBe(before);
    expect(m.tool.getText()).toBe("It's here: open!");
  });
  it('keeps the text and works the advice out again when the language changes', () => {
    const m = mount('en');
    m.type('Le washroom est verified.');
    m.press('gl-wc-check');
    expect(m.root.innerHTML).not.toContain('Toilettes');
    m.tool.setLang('fr');
    expect(m.root.innerHTML).toContain('lang="fr-CA"');
    expect(m.root.innerHTML).toContain('>Le washroom est verified.</textarea>');
    expect(m.root.innerHTML).toContain('En français, l’application dit «\u202fToilettes\u202f».');
    expect(m.root.innerHTML).toContain('id="gl-wc-fix"');
    expect(m.box.value).toBe('Le washroom est verified.');
  });
  it('keeps the box unchecked across a change of language when it was not checked', () => {
    const m = mount('en');
    m.type('Verified.');
    m.tool.setLang('fr');
    expect(m.root.innerHTML).toContain('<div data-gl-wc-out></div>');
    expect(m.tool.getAdvice()).toBeNull();
    const before = m.root.innerHTML;
    m.tool.setLang('fr');
    expect(m.root.innerHTML).toBe(before);
  });
  it('ignores events from other controls and events with no target', () => {
    const m = mount();
    const before = m.root.innerHTML;
    m.root.fire('input', { id: 'other', value: 'x' });
    m.root.fire('input', { id: 'gl-wc-text' });
    m.root.fire('input', null);
    m.root.fire('click', { id: 'other' });
    m.root.fire('click', null);
    m.root.fire('click', 'text');
    expect(m.root.innerHTML).toBe(before);
    expect(m.tool.getText()).toBe('');
  });
  it('stores nothing and sends nothing: it only reads the box and writes the page', () => {
    const m = mount();
    m.type('Verified.');
    m.press('gl-wc-check');
    expect([...m.root.els.keys()]).toEqual(['#gl-wc-text']);
  });
});

describe('saving the advice', () => {
  const today = '2026-11-19';
  it('writes the advice as text, with the day and what the check cannot do', () => {
    const text = wordingAdviceText(adviseWording('Verified by a partner.', 'en'), 'en', today);
    expect(text.startsWith('Advice on wording\nMade on 2026-11-19.\n\nThere are 2 things to look at.\n\n- Found: Verified. This word says')).toBe(true);
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(2);
    expect(text.endsWith('It cannot tell whether the text is true.\n')).toBe(true);
  });
  it('says so when there was nothing to change', () => {
    expect(wordingAdviceText([], 'fr', today)).toBe(
      'Conseils de formulation\nFait le 2026-11-19.\n\nRien à changer n’a été trouvé.\nCe contrôle cherche certains mots et les phrases longues. Il ne peut pas dire si le texte est vrai.\n',
    );
  });
  it('holds of the person’s text only the words the advice is about', () => {
    const text = wordingAdviceText(adviseWording('My private note says this is verified by Sam at 12 Oak Street.', 'en'), 'en', today);
    expect(text).toContain('Found: verified');
    expect(text).not.toContain('Oak Street');
    expect(text).not.toContain('Sam');
  });
  it('names the file by language', () => {
    expect(wordingAdviceFilename('en')).toBe('wording-advice-en.txt');
    expect(wordingAdviceFilename('fr')).toBe('wording-advice-fr.txt');
  });
  it('offers to save only when the host takes files and there is advice', () => {
    const view = (o: Partial<Parameters<typeof renderWordingCheck>[0]>): string => renderWordingCheck({ lang: 'en', text: '', advice: null, message: '', ...o });
    const advice = adviseWording('Verified.', 'en');
    expect(view({ advice, canSave: true })).toContain(`id="${WORDINGCHECK_IDS.save}">Save this advice as text</button>`);
    expect(view({ advice })).not.toContain(WORDINGCHECK_IDS.save);
    expect(view({ advice: [], canSave: true })).not.toContain(WORDINGCHECK_IDS.save);
    expect(view({ canSave: true })).not.toContain(WORDINGCHECK_IDS.save);
  });
  it('hands the host a file when the button is pressed', () => {
    const files: WordingFile[] = [];
    const root = new Root();
    mountWordingCheck(root, { lang: 'fr', today, onExport: (f) => files.push(f) });
    root.fire('click', { id: 'gl-wc-save' });
    expect(files).toHaveLength(0);
    root.querySelector('#gl-wc-text').value = 'Vérifié par la ville.';
    root.fire('click', { id: 'gl-wc-check' });
    expect(root.innerHTML).toContain('id="gl-wc-save">Enregistrer ces conseils en texte</button>');
    root.fire('click', { id: 'gl-wc-save' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('wording-advice-fr.txt');
    expect(files[0]?.mime).toBe(WORDINGCHECK_MIME);
    expect(files[0]?.text).toContain('Conseils de formulation\nFait le 2026-11-19.');
    expect(files[0]?.text).toContain('- Trouvé\u00a0: Vérifié. Ce mot dit que');
  });
  it('saves nothing for a host that takes no files, and nothing after the text is cleared', () => {
    const m = mount();
    m.type('Verified.');
    m.press('gl-wc-check');
    expect(m.root.innerHTML).not.toContain('gl-wc-save');
    const before = m.root.innerHTML;
    m.press('gl-wc-save');
    expect(m.root.innerHTML).toBe(before);
    const files: WordingFile[] = [];
    const root = new Root();
    mountWordingCheck(root, { lang: 'en', today, onExport: (f) => files.push(f) });
    root.querySelector('#gl-wc-text').value = 'Verified.';
    root.fire('click', { id: 'gl-wc-check' });
    root.fire('click', { id: 'gl-wc-clear' });
    root.fire('click', { id: 'gl-wc-save' });
    expect(files).toHaveLength(0);
  });
});

describe('WORDINGCHECK_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = WORDINGCHECK_UI[lang];
    return [
      ui.heading, ui.intro, ui.label, ui.hint(5000), ui.check, ui.clear, ui.fix, ui.empty, ui.cleared, ui.fixed, ui.nothingToFix, ui.none, ui.limits, ui.count(1), ui.count(4),
      ...Object.values(ui.kinds), ui.found('ramp'), ui.whole, ui.resultsHeading, ui.save, ui.title, ui.made('2026-11-19'),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(WORDINGCHECK_UI.fr)).toEqual(Object.keys(WORDINGCHECK_UI.en));
    expect(Object.keys(WORDINGCHECK_UI.fr.kinds)).toEqual(Object.keys(WORDINGCHECK_UI.en.kinds));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'tool'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('never says a text passed, only that nothing was found', () => {
    for (const lang of ['en', 'fr'] as const) for (const text of texts(lang)) expect(text).not.toMatch(/\b(?:approved|passed|correct|approuvé|réussi)\b/i);
  });
});
