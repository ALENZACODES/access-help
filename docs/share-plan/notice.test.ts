import { describe, expect, it } from 'vitest';
import { awkward, manySources, mixed, rec } from './fixtures.js';
import { NOTICE_SOURCES_SHOWN, SHORT_NOTICE_MAX, buildNotice, noticeFilename, noticeHint, noticeLength } from './notice.js';

describe('notice', () => {
  it('is empty when there is no source to name', () => {
    const notice = buildNotice([], 'en', 'short');
    expect(notice).toMatchObject({ text: '', asked: false, named: [], notNamed: 0, length: 0 });
    expect(noticeHint(notice, 'en')).toBe('There is no source to name, so there is no notice.');
  });
  it('names the ODbL-1.0 sources in the short form and says the rest is CC0-1.0', () => {
    const notice = buildNotice(mixed(), 'en', 'short');
    expect(notice.text).toBe('Contains data from Sample open pack, under ODbL-1.0. Other data is CC0-1.0.');
    expect(notice.asked).toBe(true);
    expect(notice.named).toEqual(['Sample open pack']);
  });
  it('says credit is not required when every record is CC0-1.0', () => {
    const notice = buildNotice([rec()], 'en', 'short');
    expect(notice.text).toBe('Data from own visit, CC0-1.0. Credit is not required.');
    expect(notice.asked).toBe(false);
    expect(noticeHint(notice, 'en')).toMatch(/^CC0-1\.0 does not ask for a notice\./);
  });
  it('names at most a few sources in the short form and counts the others', () => {
    const notice = buildNotice(manySources(7), 'en', 'short');
    expect(notice.named).toHaveLength(NOTICE_SOURCES_SHOWN);
    expect(notice.notNamed).toBe(3);
    expect(notice.text).toContain('and 3 other sources, under ODbL-1.0.');
    expect(noticeHint(notice, 'en')).toContain('Not every source is named here.');
  });
  it('uses the singular for one other source', () => {
    expect(buildNotice(manySources(5), 'en', 'short').text).toContain('and 1 other source,');
    expect(buildNotice(manySources(5), 'fr', 'short').text).toContain('et 1 autre source,');
  });
  it('names every source in the full form, with counts and dates', () => {
    const notice = buildNotice(manySources(7), 'en', 'full');
    expect(notice.named).toHaveLength(7);
    expect(notice.notNamed).toBe(0);
    expect(notice.text.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(7);
  });
  it('keeps the two licences apart in the full form', () => {
    const text = buildNotice(mixed(), 'en', 'full').text;
    expect(text).toContain('This contains data under ODbL-1.0 from:\n- Sample open pack, ODbL-1.0, 2 records, seen from 2026-09-15 to 2026-09-20.');
    expect(text).toContain('Data under CC0-1.0 (credit not required) from:\n- own visit, CC0-1.0, 2 records,');
    expect(text).toContain('A changed database shared in public stays under ODbL-1.0.');
    expect(text.endsWith('The data comes with no promise that it is right or complete.')).toBe(true);
  });
  it('never names a licence the App does not take or a record with no source', () => {
    for (const form of ['short', 'full'] as const) {
      const text = buildNotice(awkward(), 'en', form).text;
      expect(text).not.toContain('CC-BY');
      expect(text).not.toContain('Other list');
    }
  });
  it('says when the short form runs long', () => {
    const long = manySources(4).map((r, i) => ({ ...r, source: `A source with quite a long name to push the notice past its short length, number ${i}` }));
    const notice = buildNotice(long, 'en', 'short');
    expect(notice.fitsShort).toBe(false);
    expect(noticeHint(notice, 'en')).toContain(`It is longer than ${SHORT_NOTICE_MAX} characters.`);
    expect(buildNotice(mixed(), 'en', 'short').fitsShort).toBe(true);
  });
  it('counts characters as a reader sees them', () => {
    expect(noticeLength('café')).toBe(4);
    expect(noticeLength('a😀b')).toBe(3);
    expect(buildNotice(mixed(), 'en', 'short').length).toBe(noticeLength(buildNotice(mixed(), 'en', 'short').text));
  });
  it('writes French with a no-break space before the colon', () => {
    expect(buildNotice(mixed(), 'fr', 'short').text).toBe('Contient des données de Sample open pack, sous ODbL-1.0. Les autres données sont en CC0-1.0.');
    expect(buildNotice(mixed(), 'fr', 'full').text).toContain('provenant de :');
  });
  it('names the file by form and day', () => {
    expect(noticeFilename('short', '2026-11-19')).toBe('notice-short-2026-11-19.txt');
    expect(noticeFilename('full', '2026-11-19')).toBe('notice-full-2026-11-19.txt');
  });
});
