import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import { DATA_LABELS, DATA_LABEL_MASK, dataLabelsIn, isDataLabel, isOnlyDataLabel, lintClaims, lintCopy, maskDataLabels, plainLanguageIssues } from './index';

describe('DATA_LABELS', () => {
  it('holds the two tokens the catalogue check accepts, in upper case', () => {
    expect(DATA_LABELS).toEqual(['PROTOTYPE-UNVERIFIED', 'SEEDED-OPEN-DATA']);
    for (const label of DATA_LABELS) expect(label).toBe(label.toUpperCase());
  });
  it('knows a data label from any other value', () => {
    for (const label of DATA_LABELS) expect(isDataLabel(label)).toBe(true);
    for (const v of ['', 'prototype-unverified', 'PROTOTYPE', 'UNVERIFIED', ' PROTOTYPE-UNVERIFIED', 3, null, undefined]) expect(isDataLabel(v)).toBe(false);
  });
  it('knows a text that is nothing but one data label', () => {
    expect(isOnlyDataLabel('SEEDED-OPEN-DATA')).toBe(true);
    expect(isOnlyDataLabel('  PROTOTYPE-UNVERIFIED ')).toBe(true);
    expect(isOnlyDataLabel('Label: PROTOTYPE-UNVERIFIED')).toBe(false);
    expect(isOnlyDataLabel('')).toBe(false);
  });
});

describe('dataLabelsIn', () => {
  it('finds the labels in the order they appear', () => {
    expect(dataLabelsIn('Tier SEEDED-OPEN-DATA, then PROTOTYPE-UNVERIFIED, then SEEDED-OPEN-DATA.')).toEqual(['SEEDED-OPEN-DATA', 'PROTOTYPE-UNVERIFIED', 'SEEDED-OPEN-DATA']);
    expect(dataLabelsIn('No label here.')).toEqual([]);
  });
  it('counts only the exact upper-case token standing on its own', () => {
    for (const text of ['prototype-unverified', 'Prototype-Unverified', 'XPROTOTYPE-UNVERIFIED', 'PROTOTYPE-UNVERIFIEDX', 'PROTOTYPE-UNVERIFIED-2', 'PRE-PROTOTYPE-UNVERIFIED', 'PROTOTYPE UNVERIFIED']) {
      expect(dataLabelsIn(text), text).toEqual([]);
    }
  });
  it('finds a label next to punctuation', () => {
    expect(dataLabelsIn('(PROTOTYPE-UNVERIFIED).')).toEqual(['PROTOTYPE-UNVERIFIED']);
    expect(dataLabelsIn('"SEEDED-OPEN-DATA"\u00a0:')).toEqual(['SEEDED-OPEN-DATA']);
  });
});

describe('maskDataLabels', () => {
  it('replaces each label with a neutral word and leaves the rest alone', () => {
    expect(maskDataLabels('Tier: PROTOTYPE-UNVERIFIED.')).toBe(`Tier: ${DATA_LABEL_MASK}.`);
    expect(maskDataLabels('SEEDED-OPEN-DATA and PROTOTYPE-UNVERIFIED')).toBe(`${DATA_LABEL_MASK} and ${DATA_LABEL_MASK}`);
    expect(maskDataLabels('Nothing to set aside.')).toBe('Nothing to set aside.');
    expect(maskDataLabels('')).toBe('');
  });
  it('does not set aside the same letters in another case or inside a longer word', () => {
    for (const text of ['prototype-unverified data', 'It is unverified.', 'PROTOTYPE-UNVERIFIED-ISH']) expect(maskDataLabels(text)).toBe(text);
  });
  it('uses a mask that no wording rule flags', () => {
    expect(lintCopy(DATA_LABEL_MASK)).toEqual([]);
    expect(lintClaims(DATA_LABEL_MASK)).toEqual([]);
    expect(plainLanguageIssues(DATA_LABEL_MASK)).toEqual([]);
    expect(findBannedCopy(DATA_LABEL_MASK, 'mask')).toEqual([]);
  });
  it('makes a text with only data labels pass the rules, as the shared audit does', () => {
    for (const label of DATA_LABELS) {
      const text = `The tier is ${label}.`;
      expect(plainLanguageIssues(text).length, label).toBeGreaterThan(0);
      expect(plainLanguageIssues(maskDataLabels(text)), label).toEqual([]);
      expect(lintCopy(maskDataLabels(text)), label).toEqual([]);
    }
    expect(findBannedCopy('The tier is PROTOTYPE-UNVERIFIED.', 'x')).toEqual([]);
  });
  it('still lets the rules see the wording when it is not the token', () => {
    expect(findBannedCopy('This record is unverified.', 'x').map((f) => f.term)).toEqual(['verified']);
    expect(findBannedCopy(maskDataLabels('This record is unverified.'), 'x')).toHaveLength(1);
    expect(lintCopy(maskDataLabels('PROTOTYPE-UNVERIFIED and verified')).map((v) => v.match)).toEqual(['verified']);
  });
});
