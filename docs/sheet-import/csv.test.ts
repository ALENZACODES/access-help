import { describe, expect, it } from 'vitest';
import { detectDelimiter, MAX_CELL_CHARACTERS, MAX_SHEET_CHARACTERS, MAX_SHEET_ROWS, parseSheet, splitRows } from './csv.js';

describe('detectDelimiter', () => {
  it('finds commas, semicolons and tabs', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });
  it('looks at the first line only', () => expect(detectDelimiter('a,b\n1;2;3;4;5')).toBe(','));
  it('ignores separators inside quotes', () => expect(detectDelimiter('"a,b,c,d";e;f')).toBe(';'));
  it('falls back to a comma', () => expect(detectDelimiter('single')).toBe(','));
});

describe('splitRows', () => {
  it('splits plain rows and records the line of each', () => {
    expect(splitRows('a,b\nc,d', ',')).toEqual([{ line: 1, cells: ['a', 'b'] }, { line: 2, cells: ['c', 'd'] }]);
  });
  it('handles CRLF, lone CR and a final line break', () => {
    expect(splitRows('a,b\r\nc,d\r\n', ',')?.map((r) => r.cells)).toEqual([['a', 'b'], ['c', 'd']]);
    expect(splitRows('a\rb', ',')?.map((r) => r.cells)).toEqual([['a'], ['b']]);
  });
  it('reads quoted cells with separators, doubled quotes and line breaks', () => {
    const rows = splitRows('"a,1","say ""hi""","two\nlines"\nnext,row,here', ',');
    expect(rows?.[0]?.cells).toEqual(['a,1', 'say "hi"', 'two\nlines']);
    expect(rows?.[1]).toEqual({ line: 3, cells: ['next', 'row', 'here'] });
  });
  it('keeps empty cells', () => expect(splitRows('a,,c,', ',')?.[0]?.cells).toEqual(['a', '', 'c', '']));
  it('returns null for a quote that is never closed', () => expect(splitRows('a,"b\nc', ',')).toBeNull());
  it('treats a quote inside an unquoted cell as text', () => expect(splitRows('5" pipe,b', ',')?.[0]?.cells).toEqual(['5" pipe', 'b']));
  it('is empty for empty text', () => expect(splitRows('', ',')).toEqual([]));
});

describe('parseSheet', () => {
  it('returns the header and the rows', () => {
    const out = parseSheet('id,name\n1,Cafe\n2,Hall\n');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.table.header).toEqual(['id', 'name']);
    expect(out.table.rows).toEqual([{ line: 2, cells: ['1', 'Cafe'] }, { line: 3, cells: ['2', 'Hall'] }]);
  });
  it('drops a byte order mark', () => {
    const out = parseSheet('﻿id,name\n1,Cafe');
    expect(out.ok && out.table.header[0]).toBe('id');
  });
  it('skips blank lines and counts them', () => {
    const out = parseSheet('id,name\n\n1,Cafe\n,\n2,Hall');
    expect(out.ok && out.table.rows.map((r) => r.line)).toEqual([3, 5]);
    expect(out.ok && out.table.blankLines).toBe(2);
  });
  it('trims cells and header names', () => {
    const out = parseSheet(' id , name \n 1 ,  Cafe ');
    expect(out.ok && out.table.header).toEqual(['id', 'name']);
    expect(out.ok && out.table.rows[0]?.cells).toEqual(['1', 'Cafe']);
  });
  it('reads a semicolon sheet with decimal commas', () => {
    const out = parseSheet('lat;lon\n43,85;-79,43');
    expect(out.ok && out.table.delimiter).toBe(';');
    expect(out.ok && out.table.rows[0]?.cells).toEqual(['43,85', '-79,43']);
  });
  it('cuts a very long cell', () => {
    const out = parseSheet(`a\n${'x'.repeat(MAX_CELL_CHARACTERS + 50)}`);
    expect(out.ok && out.table.rows[0]?.cells[0]?.length).toBe(MAX_CELL_CHARACTERS);
  });
  it('fails plainly for each kind of unusable sheet', () => {
    expect(parseSheet('')).toEqual({ ok: false, code: 'empty' });
    expect(parseSheet('  \n \n')).toEqual({ ok: false, code: 'empty' });
    expect(parseSheet('id,name\n')).toEqual({ ok: false, code: 'no-rows' });
    expect(parseSheet('id,"name\n1,2')).toEqual({ ok: false, code: 'unclosed-quote' });
    expect(parseSheet('x'.repeat(MAX_SHEET_CHARACTERS + 1))).toEqual({ ok: false, code: 'too-large' });
    expect(parseSheet(`id\n${'1\n'.repeat(MAX_SHEET_ROWS + 1)}`)).toEqual({ ok: false, code: 'too-many-rows' });
  });
  it('accepts exactly the row limit', () => expect(parseSheet(`id\n${'1\n'.repeat(MAX_SHEET_ROWS)}`).ok).toBe(true));
});
