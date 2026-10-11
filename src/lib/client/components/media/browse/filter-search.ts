import {levenshteinDistance} from "@/lib/utils/levenshtein";


export const searchMediaFilterOptions = (options: string[], search: string) => {
    const query = search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const maxDistance = query.length >= 5 ? 2 : 1;

    return options.map(option => {
        const name = option.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
        if (name.startsWith(query)) return { option, score: 0 };
        if (name.includes(query)) return { option, score: 1 };
        if (query.length < 3) return { option, score: Infinity };
        const distance = Math.min(...[name, ...name.split(/\s+/)].map(word =>
            Math.min(levenshteinDistance(query, word), levenshteinDistance(query, word.slice(0, query.length)))
        ));
        return { option, score: distance <= maxDistance ? 2 + distance : Infinity };
    }).filter(result => Number.isFinite(result.score)).sort((a, b) =>
        a.score - b.score || a.option.localeCompare(b.option)
    ).map(result => result.option);
};
