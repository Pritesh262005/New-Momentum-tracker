const fs = require('fs');

let pdfParse = null;
const getPdfParse = () => {
  if (pdfParse) return pdfParse;
  // eslint-disable-next-line global-require
  pdfParse = require('pdf-parse');
  return pdfParse;
};

const cache = new Map(); // filePath -> { mtimeMs, text }
const MAX_CACHE = Number(process.env.PDF_TEXT_CACHE_MAX || 200);

const normalizeText = (t) => String(t || '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeStructuredText = (t) => String(t || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const extractTextFromPdfBuffer = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  const parse = getPdfParse();
  const data = await parse(buffer);
  return normalizeStructuredText(data?.text || '');
};

const extractTextFromPdf = async (filePath) => {
  if (!filePath) return '';
  let st;
  try {
    st = fs.statSync(filePath);
  } catch {
    return '';
  }

  const hit = cache.get(filePath);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit.text;

  const buf = fs.readFileSync(filePath);
  const parse = getPdfParse();
  const data = await parse(buf);
  const text = normalizeText(data?.text || '');

  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(filePath, { mtimeMs: st.mtimeMs, text });

  return text;
};

module.exports = { extractTextFromPdf, extractTextFromPdfBuffer };
