import { describe, expect, it } from 'vitest';
import { fieldForHeader, headersUsable, isKnownUnkept, mapHeaders, normaliseHeader } from './headers.js';

describe('normaliseHeader', () => {
  it('lowers case, removes accents and joins words with single spaces', () => {
    expect(normaliseHeader('  Observed_On ')).toBe('observed on');
    expect(normaliseHeader('État')).toBe('etat');
    expect(normaliseHeader("Date d'observation")).toBe('date d observation');
  });
});

describe('fieldForHeader', () => {
  it('knows the English names', () => {
    expect(fieldForHeader('id')).toBe('id');
    expect(fieldForHeader('Name')).toBe('name');
    expect(fieldForHeader('wheelchair')).toBe('status');
    expect(fieldForHeader('lat')).toBe('latitude');
    expect(fieldForHeader('lng')).toBe('longitude');
    expect(fieldForHeader('license')).toBe('licence');
    expect(fieldForHeader('observed_on')).toBe('observedOn');
  });
  it('knows the French names', () => {
    expect(fieldForHeader('Nom')).toBe('name');
    expect(fieldForHeader('État')).toBe('status');
    expect(fieldForHeader('vu_le')).toBe('observedOn');
    expect(fieldForHeader('Observé le')).toBe('observedOn');
    expect(fieldForHeader('identifiant')).toBe('id');
  });
  it('returns null for anything else', () => {
    expect(fieldForHeader('note')).toBeNull();
    expect(fieldForHeader('')).toBeNull();
    expect(fieldForHeader('phone')).toBeNull();
  });
});

describe('mapHeaders', () => {
  it('maps a full header and finds nothing missing', () => {
    const map = mapHeaders(['id', 'name', 'status', 'latitude', 'longitude', 'source', 'licence', 'observed_on']);
    expect(map.columns).toEqual({ id: 0, name: 1, status: 2, latitude: 3, longitude: 4, source: 5, licence: 6, observedOn: 7 });
    expect(map.missing).toEqual([]);
    expect(headersUsable(map)).toBe(true);
  });
  it('accepts any column order', () => {
    expect(mapHeaders(['source', 'lon', 'lat', 'date', 'licence']).columns).toEqual({ source: 0, longitude: 1, latitude: 2, observedOn: 3, licence: 4 });
  });
  it('lists every required column that is missing', () => {
    const map = mapHeaders(['name', 'lat', 'lon']);
    expect(map.missing).toEqual(['source', 'licence', 'observedOn']);
    expect(headersUsable(map)).toBe(false);
  });
  it('does not require id, name or status', () => {
    expect(mapHeaders(['lat', 'lon', 'source', 'licence', 'date']).missing).toEqual([]);
  });
  it('lists columns it does not keep, as written', () => {
    expect(mapHeaders(['lat', 'Note', 'Phone ', '']).unkept).toEqual(['Note', 'Phone']);
  });
  it('reads the first of two columns for one field and lists the second', () => {
    const map = mapHeaders(['lat', 'latitude', 'lon']);
    expect(map.columns.latitude).toBe(0);
    expect(map.repeated).toEqual(['latitude']);
  });
  it('notices a tier column in either language and does not keep it', () => {
    expect(mapHeaders(['lat', 'Tier']).hasTier).toBe(true);
    expect(mapHeaders(['lat', 'niveau']).hasTier).toBe(true);
    expect(mapHeaders(['lat', 'Tier']).unkept).toEqual(['Tier']);
    expect(mapHeaders(['lat']).hasTier).toBe(false);
  });
});

describe('isKnownUnkept', () => {
  it('knows the usual extra columns', () => {
    expect(isKnownUnkept('Notes')).toBe(true);
    expect(isKnownUnkept('Commentaire')).toBe(true);
    expect(isKnownUnkept('phone')).toBe(false);
  });
});
