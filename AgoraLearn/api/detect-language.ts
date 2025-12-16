// Language detection utility for voice queries
// Uses franc-min for ISO 639-3 detection and maps to ISO 639-1
// Usage: detectLanguage(text: string): string

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { franc } = require('franc-min');

const isoMap = {
  // Common languages mapped to project locale codes
  spa: 'es',
  fra: 'fr',
  ita: 'it',
  deu: 'de',
  eng: 'en',
  hin: 'hi',
  ben: 'bn',
  mar: 'mr',
  tel: 'te',
  kan: 'kn',
  mal: 'ml',
  guj: 'gu',
  pan: 'pa',
  urd: 'ur',
  rus: 'ru',
  por: 'pt',
  nld: 'nl',
  swe: 'sv',
  pol: 'pl',
  tur: 'tr',
  vie: 'vi',
  ind: 'id',
  tha: 'th',
  jpn: 'ja',
  kor: 'ko',
  ara: 'ar',
  cmn: 'zh-CN', // Mandarin -> simplified by default
  zho: 'zh-CN',
  yue: 'zh-TW', // Cantonese -> traditional (approx)
  fas: 'fa',
  ukr: 'uk'
};

function detectLanguage(text) {
  const langCode = franc(text);
  if (langCode === 'und') return 'en';
  return isoMap[langCode] || 'en';
}

module.exports = detectLanguage;
