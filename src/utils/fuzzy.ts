function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0),
  );
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export interface FuzzyCategory {
  name: string;
  score: number;
  count: number;
}

export function fuzzySearchCategories(
  categories: Map<string, number>,
  query: string,
  limit = 3,
): FuzzyCategory[] {
  if (!query.trim()) {
    return [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, score: 1, count }));
  }
  const lowerQuery = query.toLowerCase();
  const scored: FuzzyCategory[] = [];
  for (const [name, count] of categories) {
    const lowerName = name.toLowerCase();
    const score = similarity(lowerQuery, lowerName);
    const startsWithBonus = lowerName.startsWith(lowerQuery) ? 0.2 : 0;
    const containsBonus = lowerName.includes(lowerQuery) ? 0.1 : 0;
    const popularityBonus = count * 0.01;
    const finalScore =
      score + startsWithBonus + containsBonus + popularityBonus;
    if (finalScore > 0.3) {
      scored.push({ name, score: finalScore, count });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
