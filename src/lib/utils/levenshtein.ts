export const closest = (target: string, candidates: string[]) => {
    if (candidates.length === 0) {
        return null;
    }

    let minDistance = Infinity;
    let closestMatch = candidates[0];

    for (const candidate of candidates) {
        const distance = levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
        if (distance < minDistance) {
            minDistance = distance;
            closestMatch = candidate;
        }

        if (minDistance === 0) {
            break;
        }
    }

    return closestMatch;
};


export const levenshteinDistance = (a: string, b: string) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};
