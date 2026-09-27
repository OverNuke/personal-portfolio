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

describe('channels visible copy and order', () => {
  it('keeps the displayed handles unchanged (only hrefs change)', () => {
    expect(byId('github').detailLines).toEqual(['@overnuke', 'repositories']);
    expect(byId('linkedin').detailLines).toEqual(['/keffwontwakeup', 'network · profile']);
    expect(byId('email').detailLines).toEqual(['ksfgarcia24@gmail.com']);
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
