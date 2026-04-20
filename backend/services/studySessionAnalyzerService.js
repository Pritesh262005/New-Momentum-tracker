const startOfDay = (d) => {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const daysBetween = (a, b) => {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Study Session Analyzer (Free Stats)
 * Rules:
 * - If gap > 3 days => low consistency
 * - If accuracy drops > 15 percentage points => remedial suggestion
 *
 * @param {{logs:Array<{date:Date, duration:number, questionsAttempted:number, questionsCorrect:number}>}} params
 */
const analyzeStudyLogs = ({ logs }) => {
  const rows = (logs || [])
    .map((l) => ({
      date: new Date(l.date),
      duration: Number(l.duration || 0),
      questionsAttempted: Number(l.questionsAttempted || 0),
      questionsCorrect: Number(l.questionsCorrect || 0)
    }))
    .filter((l) => Number.isFinite(l.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const sessions = rows.length;
  if (sessions === 0) {
    return {
      sessions: 0,
      uniqueStudyDays: 0,
      maxGapDays: 0,
      lowConsistency: false,
      accuracyDrop: { dropped: false, dropPoints: 0, prevAvg: null, recentAvg: null },
      suggestions: ['Add at least 3 study sessions to get insights.'],
      series: []
    };
  }

  // Unique study days and gaps
  const uniqueDays = [];
  const seen = new Set();
  for (const r of rows) {
    const d = startOfDay(r.date);
    const key = d.toISOString();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDays.push(d);
    }
  }

  let maxGapDays = 0;
  let lastGap = null;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const gap = daysBetween(uniqueDays[i - 1], uniqueDays[i]) - 1; // days without study between two study days
    if (gap > maxGapDays) maxGapDays = gap;
    if (gap > 0) lastGap = { from: uniqueDays[i - 1], to: uniqueDays[i], gapDays: gap };
  }

  const lowConsistency = maxGapDays > 3;

  // Accuracy drop
  const accSessions = rows
    .filter((r) => r.questionsAttempted > 0)
    .map((r) => ({
      date: r.date,
      accuracy: (r.questionsCorrect / r.questionsAttempted) * 100
    }));

  let accuracyDrop = { dropped: false, dropPoints: 0, prevAvg: null, recentAvg: null };
  if (accSessions.length >= 6) {
    const recent = accSessions.slice(-7).map((x) => x.accuracy);
    const prev = accSessions.slice(-14, -7).map((x) => x.accuracy);
    if (prev.length >= 3 && recent.length >= 3) {
      const prevAvg = mean(prev);
      const recentAvg = mean(recent);
      const dropPoints = prevAvg - recentAvg;
      accuracyDrop = {
        dropped: dropPoints > 15,
        dropPoints: round2(Math.max(0, dropPoints)),
        prevAvg: round2(prevAvg),
        recentAvg: round2(recentAvg)
      };
    }
  }

  const suggestions = [];
  if (lowConsistency) {
    suggestions.push('Low consistency detected: try a small daily target (e.g., 25 minutes) and keep a 7-day streak.');
  } else {
    suggestions.push('Consistency looks stable. Keep the streak by studying at least a little on busy days.');
  }

  if (accuracyDrop.dropped) {
    suggestions.push('Accuracy dropped by >15%. Suggestion: do remedial practice on weak topics and reattempt similar questions.');
  } else if (accuracyDrop.prevAvg !== null && accuracyDrop.recentAvg !== null) {
    suggestions.push('Accuracy trend looks steady. Keep doing mixed practice and review wrong answers.');
  } else {
    suggestions.push('Log a few sessions with questions attempted to get accuracy-based suggestions.');
  }

  // Simple series for UI charts
  const series = rows.map((r) => {
    const acc = r.questionsAttempted > 0 ? (r.questionsCorrect / r.questionsAttempted) * 100 : null;
    return {
      date: startOfDay(r.date).toISOString(),
      minutes: Math.round((r.duration || 0) * 100) / 100,
      accuracy: acc === null ? null : round2(acc)
    };
  });

  return {
    sessions,
    uniqueStudyDays: uniqueDays.length,
    maxGapDays,
    lastGap,
    lowConsistency,
    accuracyDrop,
    suggestions,
    series
  };
};

module.exports = { analyzeStudyLogs };

