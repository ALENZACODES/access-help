import { describe, expect, it } from 'vitest';
import { mixedSession, notes, obs, started } from './fixtures.js';
import { SESSION_COLUMNS, itemLine, sessionCsv, sessionFilename, sessionText } from './report.js';
import { setOutcome } from './session.js';

describe('summary of a sitting', () => {
  it('opens with the day, the cannot-see line, the order and the counts', () => {
    const lines = sessionText(mixedSession(), notes(), 'en').split('\n');
    expect(lines[0]).toBe('Adding by hand, sitting begun 2026-11-19');
    expect(lines[1]).toMatch(/^The App adds nothing to OpenStreetMap and cannot see it\./);
    expect(lines[2]).toBe('Order: newest first.');
    expect(lines[3]).toBe('In this sitting: 4. Said added: 1. Skipped: 1. For later: 1. Not looked at yet: 1.');
  });
  it('lists every observation with outcome, status, source, licence, date and tier', () => {
    const text = sessionText(mixedSession(), notes(), 'en');
    expect(text).toContain('1. Sample Café. You said you added it, changeset 123456. Status: limited. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-12. Tier: UNKNOWN.');
    expect(text).toContain('2. Sample Library. Skipped: the map was checked after my visit.');
    expect(text).toContain('3. Place without a name. For later.');
    expect(text).toContain('4. Sample Arena. Not looked at yet. Status: no.');
  });
  it('adds a group per changeset with its draft', () => {
    const text = sessionText(mixedSession(), notes(), 'en');
    expect(text).toContain('Changeset 123456: 1 place\ncomment=Wheelchair access for 1 place, seen in person on 2026-11-12.\nsource=own visit\n');
  });
  it('has no group section when nothing was added', () => {
    expect(sessionText(started(), notes(), 'en')).not.toContain('comment=');
  });
  it('leaves out an observation that is no longer saved but keeps the numbering of the rest', () => {
    const text = sessionText(mixedSession(), notes().filter((r) => r.id !== 'a1'), 'en');
    expect(text).not.toContain('Sample Library');
    expect(text).toContain('3. Place without a name.');
  });
  it('writes UNKNOWN for a missing source and an odd status', () => {
    expect(itemLine(obs({ source: ' ', wheelchair: 'maybe' }), undefined, 'en')).toBe('Sample Library. Not looked at yet. Status: UNKNOWN. Source: UNKNOWN. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.');
  });
  it('writes French with French spacing', () => {
    const text = sessionText(mixedSession(), notes(), 'fr');
    expect(text.split('\n')[0]).toBe('Ajout à la main, séance commencée le 2026-11-19');
    expect(text).toContain('Ordre : les plus récentes d’abord.');
    expect(text).toContain('2. Sample Library. Passée : la carte a été contrôlée après ma visite. État : yes.');
    expect(text).toContain('Niveau : UNKNOWN.');
  });
  it('ends with a newline', () => {
    expect(sessionText(started(), notes(), 'en').endsWith('\n')).toBe(true);
  });
});

describe('sitting CSV', () => {
  it('has a header and one line per observation, with CRLF', () => {
    const lines = sessionCsv(mixedSession(), notes()).split('\r\n');
    expect(lines[0]).toBe(SESSION_COLUMNS.join(','));
    expect(lines[1]).toBe('1,a3,Sample Café,said-added,,123456,limited,own visit,CC0-1.0,2026-11-12,UNKNOWN,"44.30000, -78.32000"');
    expect(lines[2]).toBe('2,a1,Sample Library,skipped,map-is-newer,,yes,own visit,CC0-1.0,2026-11-10,UNKNOWN,"43.85000, -79.43000"');
    expect(lines[3]).toBe('3,a4,,later,,,yes,own visit,CC0-1.0,2026-11-09,UNKNOWN,"44.30100, -78.32100"');
    expect(lines[4]).toBe('4,a2,Sample Arena,open,,,no,own visit,CC0-1.0,2026-11-08,UNKNOWN,"43.85100, -79.43100"');
    expect(lines[5]).toBe('');
  });
  it('words an added outcome as said-added', () => {
    expect(sessionCsv(mixedSession(), notes())).not.toMatch(/,added,/);
  });
  it('quotes a name with a comma and defuses a formula', () => {
    let session = started();
    session = setOutcome(session, 'a3', { kind: 'later' });
    const records = notes().map((r) => (r.id === 'a3' ? { ...r, name: '=HYPERLINK("x"), Café' } : r));
    expect(sessionCsv(session, records).split('\r\n')[1]).toContain(`"'=HYPERLINK(""x""), Café"`);
  });
  it('names the files by the day the sitting began', () => {
    expect(sessionFilename({ startedOn: '2026-11-19' }, 'txt')).toBe('adding-by-hand-2026-11-19.txt');
    expect(sessionFilename({ startedOn: '2026-11-19' }, 'csv')).toBe('adding-by-hand-2026-11-19.csv');
  });
});
