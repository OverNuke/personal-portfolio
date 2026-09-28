import { describe, expect, it } from 'vitest';
import { channels } from './channels';

const byId = (id: string) => {
  const channel = channels.find((c) => c.id === id);
  if (!channel) throw new Error(`missing channel ${id}`);
  return channel;
};

describe('channels destinations', () => {
  it('points GitHub at the OverNuke account', () => {
    expect(byId('github').href).toBe('https://github.com/OverNuke');
  });

  it('points LinkedIn at the real profile', () => {
    expect(byId('linkedin').href).toBe('https://www.linkedin.com/in/keffwontwakeup/');
  });

  it('keeps the email mailto unchanged', () => {
    expect(byId('email').href).toBe('mailto:ksfgarcia24@gmail.com');
  });

  it('points WhatsApp at the real QR-code chat link', () => {
    expect(byId('whatsapp').href).toBe('https://wa.me/qr/PKLHNEL4XMKDG1');
  });

  it('points Book-a-call at the real Cal.com 30-minute event', () => {
    expect(byId('book-a-call').href).toBe('https://cal.com/d/wSQggcU1aGAVd3nJRwkAgq/30min');
  });
});

describe('channels QR image', () => {
  it('gives WhatsApp a real QR image and drops the empty placeholder', () => {
    expect(byId('whatsapp').qrImage).toBeTruthy();
    expect(byId('whatsapp').qrPlaceholder).toBeFalsy();
  });

  it('leaves every other channel without a QR image or placeholder', () => {
    for (const id of ['email', 'github', 'linkedin', 'book-a-call']) {
      expect(byId(id).qrImage).toBeUndefined();
      expect(byId(id).qrPlaceholder).toBeUndefined();
    }
  });
});

// Phase 4.4: `label`/`ctaLabel` became `Localized<string>`, `detailLines`
// became `Localized<string[]>` (parity: same length in both locales).
// Proper-noun handles/emails/brand names stay byte-identical across
// locales; generic English words ("repositories", "network · profile",
// "send message", etc.) get a real translation. "Book a call" is the one
// `label` that is NOT a proper noun and DOES translate (task 4.4's explicit
// exception).
describe('channels visible copy and order (en)', () => {
  it('keeps the displayed handles unchanged (only hrefs change)', () => {
    expect(byId('github').detailLines?.en).toEqual(['@overnuke', 'repositories']);
    expect(byId('linkedin').detailLines?.en).toEqual(['/keffwontwakeup', 'network · profile']);
    expect(byId('email').detailLines?.en).toEqual(['ksfgarcia24@gmail.com']);
  });

  it('keeps the channel ids and order', () => {
    expect(channels.map((c) => c.id)).toEqual([
      'email',
      'github',
      'whatsapp',
      'linkedin',
      'book-a-call',
    ]);
  });
});

describe('Phase 4.4: every channel is localized', () => {
  it('has non-empty label/ctaLabel in both locales for all 5 channels', () => {
    expect(channels).toHaveLength(5);
    for (const channel of channels) {
      expect(channel.label.en.length, `${channel.id}.label.en`).toBeGreaterThan(0);
      expect(channel.label.es.length, `${channel.id}.label.es`).toBeGreaterThan(0);
      expect(channel.ctaLabel.en.length, `${channel.id}.ctaLabel.en`).toBeGreaterThan(0);
      expect(channel.ctaLabel.es.length, `${channel.id}.ctaLabel.es`).toBeGreaterThan(0);
    }
  });

  it('has matching-length en/es detailLines wherever detailLines exist', () => {
    for (const channel of channels) {
      if (!channel.detailLines) continue;
      expect(channel.detailLines.es.length, channel.id).toBe(channel.detailLines.en.length);
      for (const line of [...channel.detailLines.en, ...channel.detailLines.es]) {
        expect(line.length, channel.id).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the 4 brand-name labels (Email/GitHub/WhatsApp/LinkedIn) byte-identical across locales', () => {
    for (const id of ['email', 'github', 'whatsapp', 'linkedin']) {
      const channel = byId(id);
      expect(channel.label.es, id).toBe(channel.label.en);
    }
  });

  it('translates "Book a call" -- the one label that is not a proper noun', () => {
    const bookACall = byId('book-a-call');
    expect(bookACall.label.en).toBe('Book a call');
    expect(bookACall.label.es).toBe('Agenda una llamada');
    expect(bookACall.label.es).not.toBe(bookACall.label.en);
  });

  it('translates every ctaLabel', () => {
    expect(byId('email').ctaLabel.es).toBe('enviar mensaje');
    expect(byId('github').ctaLabel.es).toBe('código fuente');
    expect(byId('whatsapp').ctaLabel.es).toBe('escanea · chat directo');
    expect(byId('linkedin').ctaLabel.es).toBe('conectar');
    // "30 min · gmt-6" is a locale-neutral time/timezone notation, not
    // prose -- no English word to translate, kept identical on purpose.
    expect(byId('book-a-call').ctaLabel.es).toBe('30 min · gmt-6');
  });

  it('translates the generic-English detailLines while keeping handles/emails untranslated', () => {
    expect(byId('github').detailLines?.es).toEqual(['@overnuke', 'repositorios']);
    expect(byId('linkedin').detailLines?.es).toEqual(['/keffwontwakeup', 'red · perfil']);
    // The email address itself is not translatable text.
    expect(byId('email').detailLines?.es).toEqual(['ksfgarcia24@gmail.com']);
  });
});
