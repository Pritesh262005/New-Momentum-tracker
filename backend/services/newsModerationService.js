const DEFAULT_BAD_WORDS = [
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'slut',
  'whore',
  'retard',
  'idiot',
  'moron',
  'stupid'
];

const DEFAULT_BLOCK_PHRASES = [
  'kill yourself',
  'go die',
  'i will kill you'
];

const POS_WORDS = [
  'good',
  'great',
  'nice',
  'awesome',
  'excellent',
  'amazing',
  'helpful',
  'thanks',
  'thank',
  'love',
  'well',
  'clear'
];

const NEG_WORDS = [
  'bad',
  'poor',
  'worst',
  'awful',
  'hate',
  'useless',
  'stupid',
  'idiot',
  'dumb',
  'trash',
  'garbage',
  'annoying'
];

const normalize = (s) => String(s ?? '').toLowerCase();

const tokenize = (text) => normalize(text)
  .replace(/[^a-z0-9\s']/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const parseCsv = (raw) => String(raw || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const hasWholeWord = (textLower, wordLower) => {
  if (!wordLower) return false;
  const escaped = wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(textLower);
};

/**
 * Lightweight "free NLP" moderation:
 * - Keyword filter (bad words, harmful phrases)
 * - Simple lexicon sentiment score in [-1, +1]
 *
 * Returns: { allowed, reasons, sentimentScore, signals }
 */
const moderateNewsComment = (content) => {
  const enabled = String(process.env.NEWS_MODERATION_ENABLED || 'true').toLowerCase() === 'true';
  const text = String(content ?? '');
  const trimmed = text.trim();

  if (!enabled) {
    return { allowed: true, reasons: [], sentimentScore: null, signals: { enabled: false } };
  }

  const reasons = [];
  const textLower = normalize(trimmed);

  const badWords = [
    ...DEFAULT_BAD_WORDS,
    ...parseCsv(process.env.NEWS_BAD_WORDS)
  ];
  const blockPhrases = [
    ...DEFAULT_BLOCK_PHRASES,
    ...parseCsv(process.env.NEWS_BLOCK_PHRASES)
  ];

  const matchedBadWords = badWords.filter((w) => hasWholeWord(textLower, w));
  if (matchedBadWords.length > 0) reasons.push('PROFANITY');

  const matchedPhrases = blockPhrases.filter((p) => textLower.includes(String(p).toLowerCase()));
  if (matchedPhrases.length > 0) reasons.push('THREAT_OR_SELF_HARM');

  const tokens = tokenize(trimmed);
  const posSet = new Set(POS_WORDS);
  const negSet = new Set(NEG_WORDS);
  const posCount = tokens.reduce((c, t) => c + (posSet.has(t) ? 1 : 0), 0);
  const negCount = tokens.reduce((c, t) => c + (negSet.has(t) ? 1 : 0), 0);
  const denom = Math.max(1, posCount + negCount);
  const sentimentScore = (posCount - negCount) / denom; // [-1..1]

  // Extra lightweight signals
  const capsChars = trimmed.replace(/[^A-Z]/g, '').length;
  const letters = trimmed.replace(/[^A-Za-z]/g, '').length;
  const capsRatio = letters > 0 ? capsChars / letters : 0;
  const exclamations = (trimmed.match(/!/g) || []).length;

  const sentimentBlockThreshold = Number(process.env.NEWS_SENTIMENT_BLOCK_THRESHOLD ?? -0.6);
  const negativeWordMin = Number(process.env.NEWS_TOXIC_NEGATIVE_WORD_MIN ?? 3);

  const toxicBySentiment = sentimentScore <= sentimentBlockThreshold && negCount >= negativeWordMin;
  if (toxicBySentiment) reasons.push('TOXIC_SENTIMENT');

  const toxicByShouting = capsRatio >= 0.65 && exclamations >= 3 && negCount >= 1;
  if (toxicByShouting) reasons.push('AGGRESSIVE_TONE');

  const allowed = reasons.length === 0;

  return {
    allowed,
    reasons,
    sentimentScore: Number.isFinite(sentimentScore) ? Math.round(sentimentScore * 100) / 100 : null,
    signals: {
      enabled: true,
      posCount,
      negCount,
      capsRatio: Math.round(capsRatio * 100) / 100,
      exclamations,
      matchedBadWordsCount: matchedBadWords.length,
      matchedPhrasesCount: matchedPhrases.length
    }
  };
};

module.exports = { moderateNewsComment };

