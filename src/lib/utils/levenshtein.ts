export const closest = (target: string, candidates: string[]) => {
    if (candidates.length === 0) return null;

    let minDistance = Infinity;
    let closestMatch = candidates[0];
    const normalizedTarget = target.toLowerCase();

    for (const candidate of candidates) {
        const distance = levenshteinDistance(normalizedTarget, candidate.toLowerCase(), minDistance - 1);
        if (distance < minDistance) {
            minDistance = distance;
            closestMatch = candidate;
        }

        if (minDistance === 0) break;
    }

    return closestMatch;
};


// With finite bound, distances above it return maxDistance + 1
export const levenshteinDistance = (a: string, b: string, maxDistance = Infinity) => {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    if (a === b) return 0;

    // Keep only prev row, using shorter string for its cols
    if (a.length > b.length) [a, b] = [b, a];

    const row = Array.from({ length: a.length + 1 }, (_, index) => index);

    for (let i = 1; i <= b.length; i++) {
        let diagonal = row[0];
        row[0] = i;
        let rowMinimum = i;

        for (let j = 1; j <= a.length; j++) {
            const above = row[j];
            row[j] = Math.min(diagonal + (b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1), row[j - 1] + 1, above + 1);
            diagonal = above;
            rowMinimum = Math.min(rowMinimum, row[j]);
        }

        if (rowMinimum > maxDistance) return maxDistance + 1;
    }

    return Math.min(row[a.length], maxDistance + 1);
};
