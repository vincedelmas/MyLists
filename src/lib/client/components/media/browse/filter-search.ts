import {levenshteinDistance} from "@/lib/utils/levenshtein";


export const searchMediaFilterOptions = (options: string[], search: string) => {
    const query = search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const maxDistance = query.length >= 5 ? 2 : 1;

    return options.map(option => {
        const name = option.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

        if (name.startsWith(query)) return { option, score: 0 };
        if (name.includes(query)) return { option, score: 1 };
        if (query.length < 3) return { option, score: Infinity };

        const words = name.split(/\s+/);
        if (words.length > 1) words.push(name);

        let distance = maxDistance + 1;
        for (const word of words) {
            if (Math.abs(query.length - word.length) <= maxDistance) {
                distance = Math.min(distance, levenshteinDistance(query, word, maxDistance));
            }
            if (word.length > query.length) {
                distance = Math.min(distance, levenshteinDistance(query, word.slice(0, query.length), maxDistance));
            }
            if (distance <= 1) break;
        }

        return {
            option,
            score: distance <= maxDistance ? 2 + distance : Infinity,
        };
    }).filter(res => Number.isFinite(res.score))
        .sort((a, b) => a.score - b.score || a.option.localeCompare(b.option))
        .map(res => res.option);
};
