import { describe, expect, it } from 'vitest';
import { CERTIFICATIONS, CERTIFICATIONS_BY_ID } from './distinctionsData';

// Cells that legitimately have no scan and open ScanModal's honest "scan not
// yet available" placeholder. Empty since 2026-09-26: the owner confirmed
// raw/certificates/Certificado-BIG-School-*.pdf is the `aiinit` certificate,
// so its plate landed. A new cell without a scan must be added here on purpose.
const SCANLESS_ALLOW_LIST: string[] = [];

describe('CERTIFICATIONS scan coverage', () => {
  it('every cell has a scan except the explicit allow-list', () => {
    const missing = CERTIFICATIONS.filter((cert) => !cert.certificateImage).map((cert) => cert.id);
    expect(missing).toEqual(SCANLESS_ALLOW_LIST);
  });

  it('the cells that do have a scan carry a non-empty PNG plate URL', () => {
    const withScan = CERTIFICATIONS.filter((cert) => cert.certificateImage);
    expect(withScan).toHaveLength(CERTIFICATIONS.length - SCANLESS_ALLOW_LIST.length);
    for (const cert of withScan) {
      expect(cert.certificateImage, cert.id).toMatch(/\.png$/);
    }
  });

  it('no two cells share the same plate', () => {
    const urls = CERTIFICATIONS.flatMap((cert) =>
      cert.certificateImage ? [cert.certificateImage] : [],
    );
    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it.each([
    ['powerbi', /powerbi\.png$/],
    ['ai', /ai\.png$/],
    ['aiinit', /aiinit\.png$/],
    ['propadeutic', /propadeutic\.png$/],
  ])('%s opens its own plate, not another certificate scan', (id, plate) => {
    expect(CERTIFICATIONS_BY_ID[id].certificateImage).toMatch(plate);
  });
});

// Phase 4.2: title/labelMeta/lightboxMeta became `Localized<string>` (design
// `sdd/profile-acrostic-i18n`). Every assertion that used to read the field
// directly as a string now reads `.en`/`.es`.
describe('english cell describes the real document (ICT training diploma)', () => {
  const english = CERTIFICATIONS_BY_ID.english;

  it('keeps its id and the anglo plate', () => {
    expect(english.id).toBe('english');
    expect(english.certificateImage).toMatch(/anglo\.png$/);
  });

  it('no longer claims an English certificate anywhere, in either locale', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const text of [english.title[lang], english.labelMeta[lang], english.lightboxMeta[lang]]) {
        expect(text).not.toMatch(/English|Inglés/i);
      }
    }
  });

  it('names the ICT diploma, the Anglo Mexicano school and the 2021 date (en)', () => {
    expect(english.title.en).toBe('ICT Training Diploma');
    expect(english.labelMeta.en).toBe('Anglo Mexicano · 2021');
    expect(english.lightboxMeta.en).toBe('Colegio Anglo-Mexicano · Coatzacoalcos · 2021');
  });

  it('names the real Spanish document title (Capacitación para el Trabajo en TIC)', () => {
    expect(english.title.es).toMatch(/TIC|Tecnologías de la Información/i);
    expect(english.labelMeta.es).toBe('Anglo Mexicano · 2021');
    expect(english.lightboxMeta.es).toBe('Colegio Anglo-Mexicano · Coatzacoalcos · 2021');
  });
});

describe('toefl cell describes the real document (SEP English diploma)', () => {
  const toefl = CERTIFICATIONS_BY_ID.toefl;

  it('keeps its id and the sepToelf plate', () => {
    expect(toefl.id).toBe('toefl');
    expect(toefl.certificateImage).toMatch(/sepToelf\.png$/);
  });

  it('no longer claims TOEFL / ETS anywhere, in either locale', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const text of [toefl.title[lang], toefl.labelMeta[lang], toefl.lightboxMeta[lang]]) {
        expect(text).not.toMatch(/TOEFL|\bETS\b/i);
      }
    }
  });

  it('names SEP in the title and both metas, with the 2018 date (en)', () => {
    expect(toefl.title.en).toBe('SEP English Diploma');
    expect(toefl.labelMeta.en).toBe('SEP · 2018');
    expect(toefl.lightboxMeta.en).toBe('SEP · Coatzacoalcos · 2018');
  });

  it('legitimately mentions Inglés in the es title -- this cell really is an English diploma', () => {
    expect(toefl.title.es).toMatch(/Inglés/i);
  });
});

describe('Phase 4.2: every cert is localized', () => {
  it('has non-empty title/labelMeta/lightboxMeta in both locales, for all 9 certs', () => {
    expect(CERTIFICATIONS).toHaveLength(9);
    for (const cert of CERTIFICATIONS) {
      for (const field of ['title', 'labelMeta', 'lightboxMeta'] as const) {
        expect(cert[field].en.length, `${cert.id}.${field}.en`).toBeGreaterThan(0);
        expect(cert[field].es.length, `${cert.id}.${field}.es`).toBeGreaterThan(0);
      }
    }
  });

  // The task list's own "Java stays English" framing doesn't apply to this
  // data file (no cert mentions Java) -- the real proper nouns here are
  // institution/product names and acronyms, pinned byte-identical instead.
  it.each([
    ['anfeca', 'ANFECA'],
    ['nota', 'Universidad Veracruzana'],
    ['exaver', 'EXAVER'],
    ['exaver', 'Universidad Veracruzana'],
    ['powerbi', 'Power BI'],
    ['powerbi', 'CONISOFT'],
    ['ai', 'DataCamp'],
    ['aiinit', 'MoureDev'],
    ['propadeutic', 'TecNM'],
  ])('%s keeps the proper noun "%s" identical in both locales', (id, noun) => {
    const cert = CERTIFICATIONS_BY_ID[id];
    const en = `${cert.title.en} ${cert.labelMeta.en} ${cert.lightboxMeta.en}`;
    const es = `${cert.title.es} ${cert.labelMeta.es} ${cert.lightboxMeta.es}`;
    expect(en).toContain(noun);
    expect(es).toContain(noun);
  });

  it('translates the generic English words in the titles (not just proper nouns)', () => {
    expect(CERTIFICATIONS_BY_ID.powerbi.title.es).toBe('Introducción a Power BI');
    expect(CERTIFICATIONS_BY_ID.ai.title.es).toBe('Fundamentos de IA');
    expect(CERTIFICATIONS_BY_ID.propadeutic.title.es).toBe('Certificado Propedéutico');
  });
});
