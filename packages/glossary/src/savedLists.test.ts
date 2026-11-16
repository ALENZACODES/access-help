import { describe, expect, it } from 'vitest';
import {
  LIST_UI,
  MAX_LISTS,
  MAX_LIST_NAME,
  MAX_LIST_PLACES,
  addToList,
  auditHtml,
  cleanListName,
  createList,
  deleteList,
  deleteListId,
  frenchIssues,
  insertList,
  lintClaims,
  lintCopy,
  listErrorText,
  listsHolding,
  parseDeleteListId,
  parseLists,
  parsePickListId,
  parseRemoveListId,
  pickListId,
  plainLanguageIssues,
  removeFromList,
  removeListId,
  renderListPicker,
  renderListsPanel,
  serialiseLists,
  type Lang,
  type Lists,
  type Place,
} from './index';

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
];
const made = (...names: string[]): Lists => {
  let lists: Lists = [];
  for (const n of names) {
    const r = createList(lists, n);
    if (!r.ok) throw new Error(r.error);
    lists = r.lists;
  }
  return lists;
};

describe('cleanListName', () => {
  it('trims and joins spaces', () => {
    expect(cleanListName('  Dentist   visit \n')).toBe('Dentist visit');
  });
  it('removes control characters', () => {
    expect(cleanListName('a\u0000b\u0007c')).toBe('a b c');
  });
  it('cuts to the limit without splitting a character', () => {
    const long = '\u{1F600}'.repeat(MAX_LIST_NAME + 5);
    expect(Array.from(cleanListName(long))).toHaveLength(MAX_LIST_NAME);
  });
});

describe('createList', () => {
  it('adds an empty list', () => {
    expect(createList([], ' Saturday ')).toEqual({ ok: true, lists: [{ name: 'Saturday', ids: [] }] });
  });
  it('refuses an empty name', () => {
    expect(createList([], '   ')).toEqual({ ok: false, error: 'empty' });
  });
  it('refuses a repeated name, ignoring case and accents', () => {
    const lists = made('Café');
    expect(createList(lists, 'cafe')).toEqual({ ok: false, error: 'duplicate' });
    expect(createList(lists, 'CAFÉ')).toEqual({ ok: false, error: 'duplicate' });
  });
  it('refuses a list past the limit', () => {
    const lists = made(...Array.from({ length: MAX_LISTS }, (_, i) => `List ${i}`));
    expect(createList(lists, 'One more')).toEqual({ ok: false, error: 'full' });
  });
  it('does not change the lists it is given', () => {
    const lists = made('A');
    createList(lists, 'B');
    expect(lists).toEqual([{ name: 'A', ids: [] }]);
  });
});

describe('adding and removing places', () => {
  it('adds a place once', () => {
    let lists = made('A', 'B');
    lists = addToList(lists, 1, 'lib');
    lists = addToList(lists, 1, 'lib');
    expect(lists[1]?.ids).toEqual(['lib']);
    expect(lists[0]?.ids).toEqual([]);
  });
  it('ignores a list that does not exist', () => {
    const lists = made('A');
    expect(addToList(lists, 5, 'lib')).toBe(lists);
    expect(addToList(lists, -1, 'lib')).toBe(lists);
  });
  it('caps a list, dropping the oldest', () => {
    let lists = made('A');
    for (let i = 0; i < MAX_LIST_PLACES + 3; i++) lists = addToList(lists, 0, `p${i}`);
    expect(lists[0]?.ids).toHaveLength(MAX_LIST_PLACES);
    expect(lists[0]?.ids[0]).toBe('p3');
  });
  it('removes a place', () => {
    const lists = addToList(addToList(made('A'), 0, 'lib'), 0, 'cafe');
    expect(removeFromList(lists, 0, 'lib')[0]?.ids).toEqual(['cafe']);
  });
  it('leaves things alone when there is nothing to remove', () => {
    const lists = made('A');
    expect(removeFromList(lists, 0, 'lib')).toBe(lists);
    expect(removeFromList(lists, 3, 'lib')).toBe(lists);
  });
  it('says which lists hold a place', () => {
    const lists = addToList(addToList(made('A', 'B', 'C'), 0, 'lib'), 2, 'lib');
    expect(listsHolding(lists, 'lib')).toEqual([0, 2]);
    expect(listsHolding(lists, 'cafe')).toEqual([]);
  });
});

describe('deleteList / insertList', () => {
  it('deletes by index', () => {
    expect(deleteList(made('A', 'B', 'C'), 1).map((l) => l.name)).toEqual(['A', 'C']);
  });
  it('ignores an index that is not a list', () => {
    expect(deleteList(made('A'), 4)).toHaveLength(1);
  });
  it('puts a list back where it was', () => {
    const lists = addToList(made('A', 'B', 'C'), 1, 'lib');
    const gone = lists[1];
    if (gone === undefined) throw new Error('no list');
    expect(insertList(deleteList(lists, 1), 1, gone)).toEqual(lists);
  });
  it('puts a list at the end when the old place is past the end', () => {
    expect(insertList(made('A'), 9, { name: 'Z', ids: [] }).map((l) => l.name)).toEqual(['A', 'Z']);
  });
  it('refuses to bring back a repeated name or exceed the limit', () => {
    const lists = made('A');
    expect(insertList(lists, 0, { name: 'a', ids: [] })).toBe(lists);
    const full = made(...Array.from({ length: MAX_LISTS }, (_, i) => `L${i}`));
    expect(insertList(full, 0, { name: 'New', ids: [] })).toBe(full);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const lists = addToList(made('A', 'B'), 0, 'lib');
    expect(parseLists(serialiseLists(lists))).toEqual(lists);
  });
  it('rejects text that is not a list of lists', () => {
    for (const bad of ['', 'nope', '{}', '5', 'null', '"x"']) expect(parseLists(bad), bad).toBeNull();
  });
  it('drops bad lists and bad places', () => {
    const raw = JSON.stringify([{ name: 'A', ids: ['lib', 3, '', 'lib'] }, { name: 7, ids: [] }, { name: 'B' }, 'x', null, [], { name: ' ', ids: [] }]);
    expect(parseLists(raw)).toEqual([{ name: 'A', ids: ['lib'] }]);
  });
  it('cleans names and drops repeats', () => {
    const raw = JSON.stringify([{ name: '  A  ', ids: [] }, { name: 'a', ids: ['x'] }]);
    expect(parseLists(raw)).toEqual([{ name: 'A', ids: [] }]);
  });
  it('cuts extra lists and places', () => {
    const raw = JSON.stringify(Array.from({ length: MAX_LISTS + 4 }, (_, i) => ({ name: `L${i}`, ids: Array.from({ length: MAX_LIST_PLACES + 5 }, (_, j) => `p${j}`) })));
    const lists = parseLists(raw) ?? [];
    expect(lists).toHaveLength(MAX_LISTS);
    expect(lists[0]?.ids).toHaveLength(MAX_LIST_PLACES);
  });
  it('is safe with prototype keys', () => {
    const lists = parseLists('[{"name":"__proto__","ids":["constructor"]}]') ?? [];
    expect(lists[0]?.name).toBe('__proto__');
    expect(({} as Record<string, unknown>).ids).toBeUndefined();
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseRemoveListId(removeListId(2, 11))).toEqual({ list: 2, place: 11 });
    expect(parseDeleteListId(deleteListId(3))).toBe(3);
    expect(parsePickListId(pickListId(7))).toBe(7);
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-lrm-1', 'gl-lrm--1-2', 'gl-ldel-x', 'gl-lst-', 'gl-save-1']) {
      expect(parseRemoveListId(id)).toBeNull();
      expect(parseDeleteListId(id)).toBeNull();
      expect(parsePickListId(id)).toBeNull();
    }
  });
});

describe('markup', () => {
  const lists = addToList(made('Dentist visit', 'Saturday'), 0, 'cafe');
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const message of ['', 'Done.']) {
      expect(auditHtml(`<div lang="${lang}">${renderListsPanel({ lang, lists, places, message })}</div>`, 'lists')).toEqual([]);
    }
    expect(auditHtml(`<div lang="${lang}">${renderListsPanel({ lang, lists: [], places, message: '' })}</div>`, 'lists')).toEqual([]);
  });
  it('shows each list with its places and buttons', () => {
    const html = renderListsPanel({ lang: 'en', lists, places, message: '' });
    expect(html).toContain('Dentist visit');
    expect(html).toContain('Café Nord');
    expect(html).toContain('id="gl-lrm-0-1"');
    expect(html).toContain('id="gl-ldel-1"');
    expect(html).toContain('(1 place)');
    expect(html).toContain('(0 places)');
  });
  it('skips places that are not loaded', () => {
    const gone = addToList(made('A'), 0, 'not-loaded');
    expect(renderListsPanel({ lang: 'en', lists: gone, places, message: '' })).toContain(LIST_UI.en.emptyList);
  });
  it('escapes names', () => {
    const html = renderListsPanel({ lang: 'en', lists: made('<b>x</b>'), places, message: '<i>' });
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('<i>');
  });
  it('has a labelled name box', () => {
    expect(renderListsPanel({ lang: 'en', lists: [], places, message: '' })).toContain('<label for="gl-list-name">');
  });
  it('offers a picker only when there is a list to add to', () => {
    expect(renderListPicker([], places[0] as Place, 0, 'en')).toBe('');
    const html = renderListPicker(lists, places[1] as Place, 1, 'en');
    expect(html).toContain('id="gl-lst-1"');
    expect(html).toContain('<option value="1">Saturday</option>');
    expect(html).not.toContain('<option value="0">');
  });
  it('offers nothing when every list already holds the place', () => {
    const both = addToList(lists, 1, 'cafe');
    expect(renderListPicker(both, places[1] as Place, 1, 'en')).toBe('');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = LIST_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.nameLabel, ui.create, ui.none, ui.count(1), ui.count(3), ui.emptyList, ui.remove, ui.delete, ui.pick,
      ui.removeLabel('Library', 'Saturday'), ui.deleteLabel('Saturday'), ui.pickLabel('Library'),
      listErrorText('empty', lang), listErrorText('duplicate', lang), listErrorText('full', lang),
    ];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
  it('has the same errors in both languages', () => {
    expect(Object.keys(LIST_UI.fr.errors)).toEqual(Object.keys(LIST_UI.en.errors));
  });
});
