const crypto = require('crypto');

const CAPTCHA_TTL = 5 * 60 * 1000;
const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const captchaStore = new Map();

function randomCode(length = 4) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += CAPTCHA_CHARS[crypto.randomInt(0, CAPTCHA_CHARS.length)];
  }
  return code;
}

function createCaptcha(code = randomCode()) {
  cleanupExpiredCaptchas();

  const id = crypto.randomUUID();
  captchaStore.set(id, {
    code: String(code).toUpperCase(),
    expiresAt: Date.now() + CAPTCHA_TTL
  });

  const text = String(code)
    .toUpperCase()
    .split('')
    .map((character, index) => {
      const x = 22 + index * 30;
      const y = 34 + crypto.randomInt(-3, 4);
      const rotate = crypto.randomInt(-18, 19);
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${character}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 5 }, () => {
    const x1 = crypto.randomInt(0, 140);
    const y1 = crypto.randomInt(0, 44);
    const x2 = crypto.randomInt(0, 140);
    const y2 = crypto.randomInt(0, 44);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="44" viewBox="0 0 140 44">',
    '<rect width="140" height="44" rx="4" fill="#f2f6fc"/>',
    '<g stroke="#a8abb2" stroke-width="1" opacity=".55">',
    lines,
    '</g>',
    '<g fill="#303133" font-size="28" font-family="Arial, sans-serif" font-weight="700">',
    text,
    '</g>',
    '</svg>'
  ].join('');

  return {
    captcha_id: id,
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  };
}

function verifyCaptcha(id, input) {
  if (!id || !input) return false;

  const captcha = captchaStore.get(id);
  captchaStore.delete(id);
  if (!captcha || captcha.expiresAt < Date.now()) return false;

  return captcha.code === String(input).trim().toUpperCase();
}

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [id, captcha] of captchaStore.entries()) {
    if (captcha.expiresAt < now) captchaStore.delete(id);
  }
}

module.exports = { createCaptcha, verifyCaptcha };
