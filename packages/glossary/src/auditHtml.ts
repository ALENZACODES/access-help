import { finding, type Finding } from './auditTypes';

interface Tag {
  readonly name: string;
  readonly closing: boolean;
  readonly attrs: ReadonlyMap<string, string>;
  readonly index: number;
  readonly end: number;
}

const NON_LABELLED_INPUT = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

function parseAttrs(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const m of raw.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const key = (m[1] ?? '').toLowerCase();
    if (key !== '' && !attrs.has(key)) attrs.set(key, m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Tags only. Assumes attribute values do not contain a raw ">" (the renderers escape it). */
function parseTags(html: string): Tag[] {
  const tags: Tag[] = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    tags.push({
      name: (m[2] ?? '').toLowerCase(),
      closing: m[1] === '/',
      attrs: parseAttrs(m[3] ?? ''),
      index: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
    });
  }
  return tags;
}

function visibleText(fragment: string): string {
  return fragment
    .replace(/<img\b[^>]*\balt\s*=\s*"([^"]*)"[^>]*>/gi, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;| | |\s/g, '');
}

function describe(tag: Tag): string {
  const id = tag.attrs.get('id');
  return id === undefined || id === '' ? `<${tag.name}>` : `<${tag.name}#${id}>`;
}

export interface HtmlAuditOptions {
  /** Require a lang attribute on the first element (default true). */
  readonly requireLang?: boolean;
}

/**
 * Static accessibility checks on rendered markup: language, unique ids, labelled controls,
 * named buttons and links, image alternatives, heading order, valid id references and
 * no positive tabindex. A quick guard in tests, not a replacement for browser testing.
 */
export function auditHtml(html: string, name = 'html', options: HtmlAuditOptions = {}): readonly Finding[] {
  const out: Finding[] = [];
  const tags = parseTags(html);
  const open = tags.filter((t) => !t.closing);

  const first = open[0];
  if ((options.requireLang ?? true) && first !== undefined && (first.attrs.get('lang') ?? '').trim() === '') {
    out.push(finding('missing-lang', `${name} ${describe(first)}`, 'The first element has no lang attribute.'));
  }

  const ids = new Map<string, number>();
  for (const t of open) {
    const id = t.attrs.get('id');
    if (id !== undefined && id !== '') ids.set(id, (ids.get(id) ?? 0) + 1);
  }
  for (const [id, n] of ids) {
    if (n > 1) out.push(finding('duplicate-id', `${name} #${id}`, `id used ${n} times.`));
  }

  const labelFor = new Map<string, string>();
  for (const t of open.filter((x) => x.name === 'label')) {
    const target = t.attrs.get('for');
    if (target === undefined) continue;
    const close = tags.find((c) => c.closing && c.name === 'label' && c.index > t.index);
    labelFor.set(target, visibleText(html.slice(t.end, close?.index ?? t.end)));
  }
  for (const [target, text] of labelFor) {
    if (!ids.has(target)) out.push(finding('dangling-reference', `${name} label[for=${target}]`, 'No element has this id.'));
    else if (text === '') out.push(finding('label-missing', `${name} label[for=${target}]`, 'Label has no text.'));
  }

  let labelDepth = 0;
  let lastHeading = 0;
  for (const t of tags) {
    if (t.name === 'label') labelDepth += t.closing ? -1 : 1;
    if (t.closing) continue;

    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const ref of (t.attrs.get(attr) ?? '').split(/\s+/).filter((r) => r !== '')) {
        if (!ids.has(ref)) {
          out.push(finding('dangling-reference', `${name} ${describe(t)}`, `${attr} points to missing id "${ref}".`));
        }
      }
    }

    const tabindex = t.attrs.get('tabindex');
    if (tabindex !== undefined && Number(tabindex) > 0) {
      out.push(finding('positive-tabindex', `${name} ${describe(t)}`, 'tabindex above 0 breaks the natural focus order.'));
    }

    if (t.name === 'img' && !t.attrs.has('alt')) {
      out.push(finding('img-alt', `${name} ${describe(t)}`, 'Image has no alt attribute.'));
    }

    if (t.name === 'input' || t.name === 'select' || t.name === 'textarea') {
      const type = (t.attrs.get('type') ?? 'text').toLowerCase();
      if (!(t.name === 'input' && NON_LABELLED_INPUT.has(type))) {
        const id = t.attrs.get('id');
        const named =
          (t.attrs.get('aria-label') ?? '').trim() !== '' ||
          (t.attrs.get('aria-labelledby') ?? '').trim() !== '' ||
          labelDepth > 0 ||
          (id !== undefined && (labelFor.get(id) ?? '') !== '');
        if (!named) out.push(finding('label-missing', `${name} ${describe(t)}`, 'Form control has no accessible name.'));
      }
    }

    if (t.name === 'button' || (t.name === 'a' && t.attrs.has('href'))) {
      const close = tags.find((c) => c.closing && c.name === t.name && c.index > t.index);
      const text = visibleText(html.slice(t.end, close?.index ?? t.end));
      const named = text !== '' || (t.attrs.get('aria-label') ?? '').trim() !== '' || (t.attrs.get('aria-labelledby') ?? '') !== '';
      if (!named) {
        out.push(finding(t.name === 'a' ? 'link-name' : 'button-name', `${name} ${describe(t)}`, 'No text or aria-label.'));
      }
      if (t.name === 'a' && t.attrs.get('target') === '_blank' && !/noopener|noreferrer/.test(t.attrs.get('rel') ?? '')) {
        out.push(finding('target-blank', `${name} ${describe(t)}`, 'target=_blank without rel=noopener.', 'warning'));
      }
    }

    const heading = /^h([1-6])$/.exec(t.name);
    if (heading !== null) {
      const level = Number(heading[1]);
      if (lastHeading !== 0 && level > lastHeading + 1) {
        out.push(finding('heading-skip', `${name} ${describe(t)}`, `Heading level jumps from h${lastHeading} to h${level}.`));
      }
      lastHeading = level;
      const close = tags.find((c) => c.closing && c.name === t.name && c.index > t.index);
      if (visibleText(html.slice(t.end, close?.index ?? t.end)) === '') {
        out.push(finding('empty-heading', `${name} ${describe(t)}`, 'Heading has no text.'));
      }
    }

  }
  for (const t of open) {
    const where = `${name} ${describe(t)}`;
    if (t.name === 'fieldset') {
      const close = tags.find((c) => c.closing && c.name === 'fieldset' && c.index > t.index);
      const legend = tags.find((c) => !c.closing && c.name === 'legend' && c.index > t.index && c.index < (close?.index ?? Infinity));
      if (legend === undefined) out.push(finding('fieldset-legend', where, 'Fieldset has no legend.'));
    }
    if (t.name === 'table') {
      const close = tags.find((c) => c.closing && c.name === 'table' && c.index > t.index);
      const inside = tags.filter((c) => c.index > t.index && c.index < (close?.index ?? Infinity));
      if (!inside.some((c) => !c.closing && c.name === 'th')) {
        out.push(finding('table-header', where, 'Table has no header cells (th).'));
      }
      if (!inside.some((c) => !c.closing && c.name === 'caption') && (t.attrs.get('aria-label') ?? '') === '') {
        out.push(finding('table-caption', where, 'Table has no caption or aria-label.', 'warning'));
      }
      for (const th of inside.filter((c) => !c.closing && c.name === 'th')) {
        if (!['col', 'row', 'colgroup', 'rowgroup'].includes(th.attrs.get('scope') ?? '')) {
          out.push(finding('th-scope', `${where} <th>`, 'Header cell has no valid scope.'));
        }
      }
    }
    for (const attr of ['aria-pressed', 'aria-checked', 'aria-expanded', 'aria-selected']) {
      const v = t.attrs.get(attr);
      const allowed = attr === 'aria-pressed' || attr === 'aria-checked' ? ['true', 'false', 'mixed'] : ['true', 'false'];
      if (v !== undefined && !allowed.includes(v)) {
        out.push(finding('aria-state-value', where, `${attr}="${v}" is not one of ${allowed.join(', ')}.`));
      }
    }
  }
  return out;
}
