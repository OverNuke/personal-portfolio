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

  // Mockup placeholders: no phone number or booking slug exists yet, and none
  // may be invented.
  it('keeps the WhatsApp and Book-a-call placeholders exactly as the mockup has them', () => {
    expect(byId('whatsapp').href).toBe('https://wa.me/');
    expect(byId('book-a-call').href).toBe('https://cal.com/');
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
