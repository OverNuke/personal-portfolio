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

describe('english cell describes the real document (ICT training diploma)', () => {
  const english = CERTIFICATIONS_BY_ID.english;

  it('keeps its id and the anglo plate', () => {
    expect(english.id).toBe('english');
    expect(english.certificateImage).toMatch(/anglo\.png$/);
  });

  it('no longer claims an English certificate anywhere', () => {
    for (const text of [english.title, english.labelMeta, english.lightboxMeta]) {
      expect(text).not.toMatch(/English/i);
    }
  });

  it('names the ICT diploma, the Anglo Mexicano school and the 2021 date', () => {
    expect(english.title).toBe('ICT Training Diploma');
    expect(english.labelMeta).toBe('Anglo Mexicano · 2021');
    expect(english.lightboxMeta).toBe('Colegio Anglo-Mexicano · Coatzacoalcos · 2021');
  });
});

describe('toefl cell describes the real document (SEP English diploma)', () => {
  const toefl = CERTIFICATIONS_BY_ID.toefl;

  it('keeps its id and the sepToelf plate', () => {
    expect(toefl.id).toBe('toefl');
    expect(toefl.certificateImage).toMatch(/sepToelf\.png$/);
  });

  it('no longer claims TOEFL / ETS anywhere', () => {
    for (const text of [toefl.title, toefl.labelMeta, toefl.lightboxMeta]) {
      expect(text).not.toMatch(/TOEFL|\bETS\b/i);
    }
  });

  it('names SEP in the title and both metas, with the 2018 date', () => {
    expect(toefl.title).toBe('SEP English Diploma');
    expect(toefl.labelMeta).toBe('SEP · 2018');
    expect(toefl.lightboxMeta).toBe('SEP · Coatzacoalcos · 2018');
  });
});
