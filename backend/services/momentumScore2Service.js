const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const round2 = (n) => Math.round(n * 100) / 100;

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
};

const movingAverage = (arr, windowSize = 3) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const w = Math.max(1, Math.min(windowSize, arr.length));
  const slice = arr.slice(-w);
  return mean(slice);
};

const safeDate = (d) => {
  const dt = new Date(d);
  return Number.isFinite(dt.getTime()) ? dt : null;
};

/**
 * Momentum Score 2.0 (Free ML)
 * - Uses TensorFlow.js linear regression (tiny 1D model) on past momentum scores
 * - Predicts next week's momentum and flags anomalies via residual z-score
 *
 * @param {{history: Array<{score:number, weekStart:Date}>, maxPoints?: number}} params
 */
const computeMomentumScore2 = async ({ history, maxPoints = 12 }) => {
  const points = (history || [])
    .map((h) => ({ score: Number(h?.score), weekStart: safeDate(h?.weekStart) }))
    .filter((h) => Number.isFinite(h.score) && h.weekStart)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .slice(-Math.max(1, maxPoints));

  const n = points.length;
  if (n === 0) {
    return {
      model: { type: 'none', points: 0 },
      nextWeek: null,
      anomaly: null
    };
  }

  const latest = points[n - 1];
  const nextWeekStart = new Date(latest.weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  // Always provide a safe fallback even if TFJS is unavailable at runtime.
  const fallback = () => {
    const ys = points.map((p) => p.score);
    const predicted = clamp(movingAverage(ys, 3), 0, 100);
    return {
      model: { type: 'moving-average', points: n, window: Math.min(3, n) },
      nextWeek: {
        weekStart: nextWeekStart,
        predictedScore: round2(predicted),
        rangeLow: null,
        rangeHigh: null
      },
      anomaly: {
        latestWeekStart: latest.weekStart,
        latestScore: round2(latest.score),
        isAnomaly: false,
        zScore: null,
        residual: null
      }
    };
  };

  if (n < 3) return fallback();

  let tf;
  try {
    // eslint-disable-next-line global-require
    tf = require('@tensorflow/tfjs');
  } catch (e) {
    return fallback();
  }

  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = points.map((p) => p.score);

  let tensors = [];
  try {
    // Closed-form simple linear regression (stable, fast).
    // y = w*x + b
    const x = tf.tensor1d(xs);
    const y = tf.tensor1d(ys);
    const xMean = x.mean();
    const yMean = y.mean();
    tensors.push(x, y, xMean, yMean);

    const cov = x.sub(xMean).mul(y.sub(yMean)).mean();
    const varX = x.sub(xMean).square().mean();
    tensors.push(cov, varX);

    const w = cov.div(varX);
    const b = yMean.sub(w.mul(xMean));
    tensors.push(w, b);

    const predsTensor = x.mul(w).add(b);
    const preds = await predsTensor.array();
    tensors.push(predsTensor);

    const nextPredTensor = tf.scalar(n).mul(w).add(b);
    const nextPred = (await nextPredTensor.array());
    tensors.push(nextPredTensor);

    const residuals = ys.map((y, i) => y - (preds[i] ?? y));
    const residualStd = stddev(residuals);
    const latestResidual = residuals[residuals.length - 1] ?? 0;

    const z = residualStd > 0 ? Math.abs(latestResidual) / residualStd : 0;
    const isAnomaly = n >= 6 && z >= 2.5;

    const predictedScore = clamp(Number(nextPred), 0, 100);
    const band = residualStd > 0 ? 1.96 * residualStd : null;

    return {
      model: { type: 'tfjs-linear-regression', points: n, method: 'closed-form' },
      nextWeek: {
        weekStart: nextWeekStart,
        predictedScore: round2(predictedScore),
        rangeLow: band === null ? null : round2(clamp(predictedScore - band, 0, 100)),
        rangeHigh: band === null ? null : round2(clamp(predictedScore + band, 0, 100))
      },
      anomaly: {
        latestWeekStart: latest.weekStart,
        latestScore: round2(latest.score),
        isAnomaly,
        zScore: round2(z),
        residual: round2(latestResidual)
      }
    };
  } catch (e) {
    return fallback();
  } finally {
    if (tensors.length) tf.dispose(tensors);
  }
};

module.exports = { computeMomentumScore2 };
