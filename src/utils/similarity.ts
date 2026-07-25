// Classic edit-distance (Levenshtein) — how many single-character insertions, deletions or
// substitutions turn `a` into `b`. Used to flag "atul satav" vs "aatul satav" as likely the
// same person typed slightly differently, without requiring an exact match.
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }
  return dist[rows - 1][cols - 1];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// True if two names are close enough that they're probably the same person/business
// misspelled slightly, rather than two genuinely different names.
export function areNamesSimilar(nameA: string, nameB: string): boolean {
  const a = normalize(nameA);
  const b = normalize(nameB);
  if (!a || !b || a === b) return a === b && a.length > 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return distance <= 2 && distance / maxLen <= 0.3;
}

export function findSimilarName<T extends { id: string; name: string }>(
  name: string,
  candidates: T[],
  excludeId?: string,
): T | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  for (const candidate of candidates) {
    if (candidate.id === excludeId) continue;
    if (areNamesSimilar(trimmed, candidate.name)) return candidate;
  }
  return null;
}
