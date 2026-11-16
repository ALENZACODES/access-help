import { describe, expect, it } from 'vitest';
import * as api from './index';

/** Every module must stay reachable from the package entry point. */
const EXPECTED = [
  'annotate', 'annotateToHtml',
  'assertAudit', 'auditCss', 'auditExitCode', 'auditHtml', 'auditTerms', 'runAudit',
  'buildIndex', 'loadOrBuildIndex', 'parseIndex', 'searchIndex',
  'buildManifest', 'connectionText', 'decideStrategy', 'planCacheUpdate',
  'importClaims', 'parseCsv',
  'exportGlossary', 'exportFilename',
  'fixFrench', 'frenchIssues', 'lintCopy', 'plainLanguageIssues',
  'lookupTerm', 'listTerms', 'searchTerms',
  'pickLang', 'htmlLang',
  'claimFreshness', 'matchPlace', 'rankPlaces', 'summarisePlace', 'verdictText',
  'renderPlaceCard', 'renderPlaceList',
  'formatProvenance', 'validateProvenance',
  'mountGlossary', 'renderShell', 'renderResults',
  'describeFeature', 'mergeClaims', 'effectiveStatus',
  'fullGlossaryCss', 'escapeHtml', 'tokenise',
] as const;

describe('package index', () => {
  it.each(EXPECTED)('exports %s as a function', (name) => {
    expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the data constants', () => {
    for (const name of ['TERMS', 'UNKNOWN_TERM', 'GLOSSARY_META', 'GLOSSARY_CSS', 'PLACE_CSS', 'THEME_CSS', 'OPEN_LICENCES']) {
      expect((api as Record<string, unknown>)[name], name).toBeDefined();
    }
  });
});
