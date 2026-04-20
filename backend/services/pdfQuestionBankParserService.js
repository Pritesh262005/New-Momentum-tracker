const normalizeNewlines = (text) => String(text || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const normalizeSpaces = (text) => String(text || '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\u00A0/g, ' ')
  .trim();

const splitQuestionBlocks = (text) => {
  const normalized = normalizeNewlines(text);
  const starts = [...normalized.matchAll(/(^|\n)\s*(\d+)\s*[\).:-]?\s*(?:QUESTION\s*:?\s*)?/g)];
  if (starts.length === 0) return [];

  return starts.map((match, index) => {
    const start = match.index + (match[1] ? match[1].length : 0);
    const end = index + 1 < starts.length ? starts[index + 1].index : normalized.length;
    return normalized.slice(start, end).trim();
  }).filter(Boolean);
};

const cleanQuestionLead = (line) => normalizeSpaces(
  String(line || '')
    .replace(/^\s*\d+\s*[\).:-]?\s*/i, '')
    .replace(/^QUESTION\s*:?\s*/i, '')
);

const detectAnswerIndexFromMarker = (optionText) => {
  const lowered = String(optionText || '').toLowerCase();
  return /\((answer|correct)\)/i.test(lowered);
};

const stripAnswerMarker = (optionText) => normalizeSpaces(
  String(optionText || '').replace(/\((answer|correct)\)/ig, '')
);

const parseAnswerLine = (line) => {
  const text = normalizeSpaces(line);
  const match = text.match(/^ANSWER\s*:?\s*([A-D]|[1-4])\b/i);
  if (!match) return null;
  const raw = match[1].toUpperCase();
  if (/^[1-4]$/.test(raw)) return Number(raw) - 1;
  return ['A', 'B', 'C', 'D'].indexOf(raw);
};

const parseQuestionBlock = (block) => {
  const lines = normalizeNewlines(block)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let questionText = cleanQuestionLead(lines[0]);
  const options = ['', '', '', ''];
  let correctAnswer = null;
  let explanation = '';
  let currentOption = -1;
  let mode = questionText ? 'question' : 'start';

  for (let i = 1; i < lines.length; i += 1) {
    const line = normalizeSpaces(lines[i]);
    if (!line) continue;

    if (/^EXPLANATION\s*:?\s*/i.test(line)) {
      explanation = normalizeSpaces(line.replace(/^EXPLANATION\s*:?\s*/i, ''));
      currentOption = -1;
      mode = 'explanation';
      continue;
    }

    const answerLineIndex = parseAnswerLine(line);
    if (answerLineIndex !== null) {
      correctAnswer = answerLineIndex;
      currentOption = -1;
      continue;
    }

    const optionMatch = line.match(/^([A-D])[\).\]:-]?\s*(.+)$/i);
    if (optionMatch) {
      currentOption = ['A', 'B', 'C', 'D'].indexOf(optionMatch[1].toUpperCase());
      const text = stripAnswerMarker(optionMatch[2]);
      options[currentOption] = text;
      if (detectAnswerIndexFromMarker(optionMatch[2])) correctAnswer = currentOption;
      mode = 'option';
      continue;
    }

    if (mode === 'explanation') {
      explanation = explanation ? `${explanation} ${line}` : line;
      continue;
    }

    if (currentOption >= 0) {
      options[currentOption] = normalizeSpaces(`${options[currentOption]} ${line}`);
      if (detectAnswerIndexFromMarker(line)) correctAnswer = currentOption;
      continue;
    }

    questionText = normalizeSpaces(`${questionText} ${line}`);
    mode = 'question';
  }

  const cleanOptions = options.map(stripAnswerMarker);
  if (!questionText || cleanOptions.some((opt) => !opt) || correctAnswer === null) return null;

  return {
    questionText,
    options: cleanOptions,
    correctAnswer,
    marks: 1,
    difficulty: 'MEDIUM',
    explanation: normalizeSpaces(explanation)
  };
};

const parseQuestionBankText = (text) => {
  const blocks = splitQuestionBlocks(text);
  const questions = blocks.map(parseQuestionBlock).filter(Boolean);

  return {
    totalBlocks: blocks.length,
    questions
  };
};

module.exports = { parseQuestionBankText };
