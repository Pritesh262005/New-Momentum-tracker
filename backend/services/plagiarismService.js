const { extractTextFromPdf } = require('./pdfTextExtractService');

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'so', 'to', 'of', 'in', 'on', 'for', 'with', 'as',
  'at', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those', 'it',
  'its', 'their', 'there', 'we', 'you', 'your', 'i', 'me', 'my', 'they', 'them', 'he', 'she', 'his', 'her',
  'can', 'could', 'should', 'would', 'will', 'may', 'might', 'not', 'no', 'yes', 'do', 'does', 'did'
]);

const normalize = (s) => String(s || '').toLowerCase();

const tokenize = (text) => normalize(text)
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

const termFreq = (tokens) => {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
};

const cosine = (a, b) => {
  let dot = 0;
  let a2 = 0;
  let b2 = 0;
  for (const v of a.values()) a2 += v * v;
  for (const v of b.values()) b2 += v * v;
  if (a2 === 0 || b2 === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, v] of small.entries()) {
    const bv = big.get(k);
    if (bv) dot += v * bv;
  }
  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
};

const buildTfidfVectors = (docsTokens) => {
  const df = new Map();
  for (const tokens of docsTokens) {
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }

  const n = docsTokens.length;
  const vectors = [];
  for (const tokens of docsTokens) {
    const tf = termFreq(tokens);
    const vec = new Map();
    for (const [t, c] of tf.entries()) {
      const dfi = df.get(t) || 1;
      const idf = Math.log((n + 1) / (dfi + 1)) + 1; // smooth idf
      vec.set(t, c * idf);
    }
    vectors.push(vec);
  }

  return vectors;
};

/**
 * Plagiarism check using TF-IDF cosine similarity on extracted PDF text.
 *
 * @param {{submissions:Array<{_id:any, submissionFile:{filePath:string}, student?:any}> , threshold?:number, topK?:number}} params
 */
const computePlagiarismReport = async ({ submissions, threshold = 0.78, topK = 3 }) => {
  const rows = (submissions || []).filter((s) => s?.submissionFile?.filePath);
  if (rows.length < 2) {
    return { threshold, topK, pairs: [], bySubmission: {} };
  }

  const texts = await Promise.all(rows.map((s) => extractTextFromPdf(s.submissionFile.filePath)));
  const tokensList = texts.map((t) => tokenize(t));
  const vectors = buildTfidfVectors(tokensList);

  const bySubmission = {};
  const pairs = [];

  for (let i = 0; i < rows.length; i += 1) {
    const a = rows[i];
    const aId = String(a._id);
    const matches = [];

    for (let j = 0; j < rows.length; j += 1) {
      if (i === j) continue;
      const b = rows[j];
      const sim = cosine(vectors[i], vectors[j]);
      if (sim <= 0) continue;
      matches.push({
        submissionId: String(b._id),
        studentId: b.student ? String(b.student._id || b.student) : null,
        studentName: b.student?.name || null,
        similarity: Math.round(sim * 1000) / 1000
      });
    }

    matches.sort((x, y) => y.similarity - x.similarity);
    const topMatches = matches.slice(0, Math.max(1, topK));
    const topSimilarity = topMatches[0]?.similarity || 0;

    bySubmission[aId] = {
      submissionId: aId,
      topSimilarity,
      suspicious: topSimilarity >= threshold,
      matches: topMatches
    };

    for (const m of topMatches) {
      if (m.similarity < threshold) continue;
      const pairKey = [aId, m.submissionId].sort().join('::');
      pairs.push({
        key: pairKey,
        aSubmissionId: aId,
        bSubmissionId: m.submissionId,
        similarity: m.similarity
      });
    }
  }

  // de-dup pairs and sort desc
  const uniq = new Map();
  for (const p of pairs) {
    const prev = uniq.get(p.key);
    if (!prev || p.similarity > prev.similarity) uniq.set(p.key, p);
  }

  return {
    threshold,
    topK,
    pairs: [...uniq.values()].sort((x, y) => y.similarity - x.similarity),
    bySubmission
  };
};

module.exports = { computePlagiarismReport };

