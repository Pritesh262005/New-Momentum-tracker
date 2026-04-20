const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'by', 'for', 'from', 'has', 'have',
  'had', 'he', 'her', 'his', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the',
  'their', 'there', 'these', 'this', 'to', 'was', 'were', 'will', 'with', 'which', 'who', 'why',
  'what', 'when', 'where', 'how', 'you', 'your', 'they', 'them', 'than', 'then', 'also', 'can',
  'may', 'might', 'should', 'could', 'would', 'used', 'using', 'use', 'such', 'through', 'during'
]);

const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const splitSentences = (text) => normalize(text)
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

const unique = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cleanPhrase = (value) => String(value || '')
  .replace(/[^\w\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const extractTerms = (sentence) => {
  const phraseMatches = sentence.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Za-z][A-Za-z-]{4,})\b/g) || [];
  return unique(
    phraseMatches
      .map(cleanPhrase)
      .filter((item) => {
        const lower = item.toLowerCase();
        return lower.length >= 4 && !STOPWORDS.has(lower);
      })
  );
};

const scoreSentence = (sentence) => {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < 8 || words.length > 30) return 0;
  const importantTerms = extractTerms(sentence).length;
  return words.length + importantTerms * 3;
};

const buildDistractors = (answer, pool) => {
  const normalizedAnswer = String(answer || '').toLowerCase();
  const answerLen = String(answer || '').length;
  const distractors = unique(pool)
    .filter((item) => {
      const normalized = String(item || '').toLowerCase();
      return normalized !== normalizedAnswer && Math.abs(String(item).length - answerLen) <= 14;
    })
    .slice(0, 3);

  const fallback = ['Algorithm', 'Protocol', 'Compiler', 'Database', 'Recursion', 'Interface', 'Network'];
  for (const item of fallback) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(item) && item.toLowerCase() !== normalizedAnswer) distractors.push(item);
  }

  return distractors.slice(0, 3);
};

const shuffle = (arr) => {
  const items = arr.slice();
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

const toQuestionStem = ({ answer, sentence, type }) => {
  const compact = sentence.replace(/\s+/g, ' ').trim();
  if (type === 'definition') return `Which term is best described by this statement? ${compact}`;
  if (type === 'purpose') return `What is the main purpose of ${answer}?`;
  if (type === 'example') return `According to the material, which concept matches this description? ${compact}`;
  return `Which concept is most closely related to this statement? ${compact}`;
};

const buildQuestionFromSentence = (sentence, distractorPool, index) => {
  const terms = extractTerms(sentence);
  const answer = terms[0];
  if (!answer) return null;

  const distractors = buildDistractors(answer, distractorPool);
  if (distractors.length < 3) return null;

  const type = ['definition', 'concept', 'purpose', 'example'][index % 4];
  const questionText = toQuestionStem({ answer, sentence, type });
  const options = shuffle([answer, ...distractors]).slice(0, 4);

  return {
    questionText,
    options,
    correctAnswer: options.findIndex((opt) => opt === answer),
    marks: 1,
    difficulty: index % 3 === 0 ? 'EASY' : index % 3 === 1 ? 'MEDIUM' : 'HARD',
    explanation: sentence
  };
};

const generateQuestionsFromText = ({ text, count = 10 }) => {
  const ranked = splitSentences(text)
    .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const distractorPool = unique(ranked.flatMap((row) => extractTerms(row.sentence)));
  const questions = [];

  for (const row of ranked) {
    if (questions.length >= count) break;
    const question = buildQuestionFromSentence(row.sentence, distractorPool, questions.length);
    if (!question) continue;
    const signature = `${question.questionText}::${question.options.join('|')}`;
    if (questions.some((q) => `${q.questionText}::${q.options.join('|')}` === signature)) continue;
    questions.push(question);
  }

  return questions.slice(0, count);
};

module.exports = { generateQuestionsFromText };
