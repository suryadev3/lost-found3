/**
 * Lightweight text-similarity engine for Lost & Found matching.
 * Uses token-based Jaccard similarity + important field weighting.
 * No external ML models or paid APIs — runs fully offline.
 */

function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2) // ignore very short tokens
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Compute similarity score (0–1) between two reports.
 * Weighted: title (40%), description (40%), location (20%)
 */
function computeSimilarity(reportA, reportB) {
  const titleScore = jaccard(tokenize(reportA.title), tokenize(reportB.title));
  const descScore = jaccard(tokenize(reportA.description), tokenize(reportB.description));
  const locScore = jaccard(tokenize(reportA.location), tokenize(reportB.location));

  // Category exact match bonus
  const categoryBonus = reportA.category === reportB.category ? 0.15 : 0;

  const score = titleScore * 0.4 + descScore * 0.4 + locScore * 0.2 + categoryBonus;
  return Math.min(1, Math.round(score * 1000) / 1000); // 3 decimal places
}

/**
 * Find matches for a new report against existing opposite-type open reports.
 * Returns array of { report, score } sorted by score descending.
 * Only returns scores >= 0.25 (configurable threshold)
 */
function findMatches(newReport, existingReports, threshold = 0.25) {
  const oppositeType = newReport.type === 'lost' ? 'found' : 'lost';

  const candidates = existingReports.filter(
    r => r.type === oppositeType && r.status === 'Open' && r.id !== newReport.id
  );

  const matches = candidates
    .map(r => ({
      report: r,
      score: computeSimilarity(newReport, r)
    }))
    .filter(m => m.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return matches;
}

module.exports = { computeSimilarity, findMatches, tokenize };
