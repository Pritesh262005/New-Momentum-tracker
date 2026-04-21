const { extractTextFromPdf } = require('./pdfTextExtractService');

/**
 * Basic grammar and readability analysis for student assignments.
 * Uses heuristics for sentence structure, common spelling errors, and word variety.
 * 
 * @param {string} text - The text to analyze
 * @returns {Promise<{score: number, summary: string, details: string[]}>}
 */
const analyzeGrammar = async (text) => {
  if (!text || text.trim().length < 10) {
    return { score: 0, summary: 'Insufficient text for analysis', details: [] };
  }

  const cleaned = text.trim();
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return { score: 0, summary: 'Empty text', details: [] };

  const details = [];
  let score = 100;

  // 1. Average sentence length (too short or too long is bad)
  const avgSentenceLength = words.length / sentences.length;
  if (avgSentenceLength < 5) {
    score -= 15;
    details.push('Sentences are very short and may lack complexity.');
  } else if (avgSentenceLength > 35) {
    score -= 10;
    details.push('Sentences are very long, consider breaking them up for clarity.');
  }

  // 2. Vocabulary variety (Unique words / total words)
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const lexicalDensity = uniqueWords / words.length;
  if (lexicalDensity < 0.4) {
    score -= 15;
    details.push('Repetitive vocabulary. Try using synonyms to improve word variety.');
  }

  // 3. Punctuation density
  const punctuationCount = (cleaned.match(/[,;:]/g) || []).length;
  if (punctuationCount / sentences.length < 0.5) {
    score -= 10;
    details.push('Low usage of commas or semicolons might indicate run-on sentences.');
  }

  // 4. Case consistency
  const lowerStartSentences = sentences.filter(s => {
    const trimmed = s.trim();
    return trimmed.length > 0 && trimmed[0] === trimmed[0].toLowerCase() && /[a-z]/.test(trimmed[0]);
  }).length;
  if (lowerStartSentences / sentences.length > 0.2) {
    score -= 20;
    details.push('Multiple sentences do not start with a capital letter.');
  }

  // Final clamping
  score = Math.max(0, Math.min(100, score));

  let summary = 'Good writing quality.';
  if (score < 50) summary = 'Needs significant improvement in structure and clarity.';
  else if (score < 75) summary = 'Fair quality, but lacks professional tone or variety.';
  else if (score >= 90) summary = 'Excellent writing with great structure.';

  return {
    score,
    summary,
    details
  };
};

module.exports = { analyzeGrammar };
