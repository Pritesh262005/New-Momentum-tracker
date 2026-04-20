const DEFAULT_MODEL = process.env.HF_TUTOR_MODEL || 'google/flan-t5-small';
const HF_BASE = process.env.HF_API_BASE || 'https://api-inference.huggingface.co/models/';

const clampText = (s, max = 1200) => {
  const str = String(s ?? '');
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
};

const toOptionLabel = (i) => ['A', 'B', 'C', 'D'][i] ?? String(i);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const makeCacheKey = (parts) => parts.map((p) => String(p ?? '')).join('|');

// Simple in-memory cache to avoid repeated HF calls
const cache = new Map(); // key -> { value, expiresAt }
const CACHE_TTL_MS = Number(process.env.AI_TUTOR_CACHE_TTL_MS || 1000 * 60 * 60); // 1h
const CACHE_MAX = Number(process.env.AI_TUTOR_CACHE_MAX || 500);

const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value) => {
  // poor-man LRU: drop oldest insertion when max exceeded
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

const hfGenerate = async ({ model = DEFAULT_MODEL, prompt, maxNewTokens = 180 }) => {
  const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN || '';
  const url = `${HF_BASE}${encodeURIComponent(model)}`;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_TUTOR_TIMEOUT_MS || 15000);
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxNewTokens,
          temperature: 0.3,
          top_p: 0.9,
          return_full_text: false
        }
      }),
      signal: controller.signal
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Hugging Face returned non-JSON (${res.status})`);
    }

    if (!res.ok) {
      const msg = json?.error || json?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // HF can return: [{ generated_text: "..." }] for text generation / text2text
    const generated = Array.isArray(json) ? (json[0]?.generated_text ?? '') : (json?.generated_text ?? '');
    const out = String(generated || '').trim();
    if (!out) throw new Error('Empty model response');
    return out;
  } finally {
    clearTimeout(t);
  }
};

const buildExplainPrompt = ({ questionText, options, correctIndex, selectedIndex }) => {
  const opts = (options || []).slice(0, 4).map((o, i) => `${toOptionLabel(i)}. ${clampText(o, 180)}`).join('\n');
  const q = clampText(questionText, 600);
  const correctLabel = toOptionLabel(correctIndex);
  const selectedLabel = selectedIndex === null || selectedIndex === undefined ? 'N/A' : toOptionLabel(selectedIndex);

  return [
    'You are an AI tutor for MCQ practice.',
    'Task: explain the concept, why the correct option is correct, and why the student choice is wrong.',
    'Constraints: 3-5 short sentences, simple language, no markdown, no citations.',
    `Question: ${q}`,
    `Options:\n${opts}`,
    `Correct option: ${correctLabel}`,
    `Student chose: ${selectedLabel}`,
    'Answer:'
  ].join('\n');
};

const buildFeedbackPrompt = ({ title, subjectName, percentage, correctAnswers, wrongAnswers }) => {
  return [
    'You are an AI tutor for a student after an MCQ test.',
    'Write short feedback with 2 strengths and 2 improvements, plus 2 next-step actions.',
    'Constraints: 5-7 sentences, simple language, no markdown.',
    `Test: ${clampText(title, 120)}`,
    `Subject: ${clampText(subjectName, 120)}`,
    `Score: ${percentage}%`,
    `Correct: ${correctAnswers}, Wrong: ${wrongAnswers}`,
    'Feedback:'
  ].join('\n');
};

const stripCodeFences = (text) => String(text || '')
  .replace(/```json\s*/gi, '')
  .replace(/```\s*/g, '')
  .trim();

const extractJsonArray = (text) => {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  const raw = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const buildMcqGenerationPrompt = ({ subjectName, topic, unitLabels, sourceText, questionCount }) => {
  const units = Array.isArray(unitLabels) && unitLabels.length > 0 ? unitLabels.join(', ') : 'selected units';
  return [
    'You are an expert teacher who creates high-quality multiple choice questions.',
    `Generate exactly ${questionCount} MCQ questions from the given study material.`,
    'Focus on concept understanding, definitions, examples, applications, and differences.',
    'Do not generate fill in the blank questions.',
    'Do not generate blank placeholder questions like ____ or "Fill in the blank".',
    'Prefer direct conceptual MCQs based on the material.',
    `Subject: ${clampText(subjectName, 120)}`,
    `Topic focus: ${clampText(topic || 'General topic from the material', 180)}`,
    `Units: ${clampText(units, 120)}`,
    'Output rules:',
    '1. Return only a JSON array.',
    '2. Each item must contain: questionText, options, correctAnswer, marks, difficulty, explanation.',
    '3. options must have exactly 4 strings.',
    '4. correctAnswer must be a number from 0 to 3.',
    '5. marks must be 1.',
    '6. difficulty must be EASY, MEDIUM, or HARD.',
    '7. Do not include markdown or commentary.',
    '8. questionText must not contain underscores used as blanks.',
    'Study material:',
    clampText(sourceText, 6000)
  ].join('\n');
};

const normalizeGeneratedMcqs = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    questionText: String(item?.questionText || '').trim(),
    options: Array.isArray(item?.options) ? item.options.slice(0, 4).map((opt) => String(opt || '').trim()) : [],
    correctAnswer: Number(item?.correctAnswer),
    marks: 1,
    difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(item?.difficulty) ? item.difficulty : 'MEDIUM',
    explanation: String(item?.explanation || '').trim()
  })).filter((item) => (
    item.questionText
    && !/fill\s+in\s+the\s+blank/i.test(item.questionText)
    && !/_{2,}/.test(item.questionText)
    && item.options.length === 4
    && item.options.every(Boolean)
    && Number.isInteger(item.correctAnswer)
    && item.correctAnswer >= 0
    && item.correctAnswer <= 3
  ));
};

const explainWrongMcq = async ({
  model = DEFAULT_MODEL,
  questionText,
  options,
  correctIndex,
  selectedIndex,
  teacherExplanation = null
}) => {
  if (teacherExplanation && String(teacherExplanation).trim()) {
    return {
      provider: 'author',
      model: null,
      text: String(teacherExplanation).trim(),
      cached: true
    };
  }

  const key = makeCacheKey(['explain', model, questionText, (options || []).join('||'), correctIndex, selectedIndex]);
  const cached = cacheGet(key);
  if (cached) return { provider: cached.provider, model: cached.model, text: cached.text, cached: true };

  const prompt = buildExplainPrompt({ questionText, options, correctIndex, selectedIndex });

  // light retry for HF cold starts/queue
  const maxTries = 2;
  for (let i = 0; i < maxTries; i += 1) {
    try {
      const text = await hfGenerate({ model, prompt, maxNewTokens: 180 });
      const value = { provider: 'huggingface', model, text };
      cacheSet(key, value);
      return { ...value, cached: false };
    } catch (e) {
      if (i === maxTries - 1) break;
      await sleep(800);
    }
  }

  const correctText = options?.[correctIndex] ?? `Option ${toOptionLabel(correctIndex)}`;
  const selectedText = selectedIndex === null || selectedIndex === undefined ? null : (options?.[selectedIndex] ?? `Option ${toOptionLabel(selectedIndex)}`);

  const fallback = [
    `Correct answer is ${toOptionLabel(correctIndex)} (${clampText(correctText, 120)}).`,
    selectedText ? `Your choice ${toOptionLabel(selectedIndex)} (${clampText(selectedText, 120)}) doesn’t match the key idea in the question.` : 'No option was selected.',
    'Re-read the question, eliminate clearly wrong options, and check for keywords/definitions.',
    'Tip: write a 1-line rule/formula for this concept and revise it tomorrow.'
  ].join(' ');

  return { provider: 'fallback', model: null, text: fallback, cached: false };
};

const generateMcqFeedback = async ({
  model = DEFAULT_MODEL,
  title,
  subjectName,
  percentage,
  correctAnswers,
  wrongAnswers
}) => {
  const key = makeCacheKey(['feedback', model, title, subjectName, percentage, correctAnswers, wrongAnswers]);
  const cached = cacheGet(key);
  if (cached) return { provider: cached.provider, model: cached.model, text: cached.text, cached: true };

  const prompt = buildFeedbackPrompt({ title, subjectName, percentage, correctAnswers, wrongAnswers });

  const maxTries = 2;
  for (let i = 0; i < maxTries; i += 1) {
    try {
      const text = await hfGenerate({ model, prompt, maxNewTokens: 220 });
      const value = { provider: 'huggingface', model, text };
      cacheSet(key, value);
      return { ...value, cached: false };
    } catch (e) {
      if (i === maxTries - 1) break;
      await sleep(800);
    }
  }

  const fallback = [
    `You scored ${percentage}% with ${correctAnswers} correct and ${wrongAnswers} wrong.`,
    'Strength: you are able to answer several questions correctly under time pressure.',
    'Improve: review the wrong questions and write down why each correct option is correct.',
    'Improve: practice 10 similar questions and track your accuracy.',
    'Next: revise key notes today and take a short quiz again in 2 days.'
  ].join(' ');

  return { provider: 'fallback', model: null, text: fallback, cached: false };
};

const generateTopicMcqs = async ({
  model = DEFAULT_MODEL,
  subjectName,
  topic,
  unitLabels,
  sourceText,
  questionCount = 10,
  fallbackQuestions = []
}) => {
  const key = makeCacheKey(['mcq-generate', model, subjectName, topic, unitLabels?.join(','), clampText(sourceText, 2400), questionCount]);
  const cached = cacheGet(key);
  if (cached) return { provider: cached.provider, model: cached.model, questions: cached.questions, cached: true };

  const prompt = buildMcqGenerationPrompt({ subjectName, topic, unitLabels, sourceText, questionCount });
  const maxTries = 2;
  for (let i = 0; i < maxTries; i += 1) {
    try {
      const text = await hfGenerate({ model, prompt, maxNewTokens: 1400 });
      const parsed = extractJsonArray(text);
      const questions = normalizeGeneratedMcqs(parsed).slice(0, questionCount);
      if (questions.length >= Math.min(5, questionCount)) {
        const value = { provider: 'huggingface', model, questions };
        cacheSet(key, value);
        return { ...value, cached: false };
      }
    } catch (e) {
      if (i === maxTries - 1) break;
      await sleep(800);
    }
  }

  return {
    provider: 'fallback',
    model: null,
    questions: (fallbackQuestions || []).slice(0, questionCount),
    cached: false
  };
};

module.exports = {
  explainWrongMcq,
  generateMcqFeedback,
  generateTopicMcqs
};
