import {MediaType} from "@/lib/utils/enums";
import {MediaNaming, NamedValue} from "@/lib/types/stats.types";


export const getMediaNaming = (mediaType: MediaType) => {
    const data: Record<MediaType, MediaNaming> = {
        series: {
            redo: "seasons re-watched",
            durationDistributionUnit: "h",
            totalSpecific: "Total Episodes Watched",
            durationDistribution: "Series Duration Distribution",
        },
        anime: {
            redo: "seasons re-watched",
            durationDistributionUnit: "h",
            totalSpecific: "Total Episodes Watched",
            durationDistribution: "Anime Duration Distribution",
        },
        movies: {
            redo: "movies re-watched",
            durationDistributionUnit: "m.",
            totalSpecific: "Total Movies Watched",
            durationDistribution: "Movies Duration Distribution",
        },
        games: {
            durationDistributionUnit: "h",
            durationDistribution: "Playthrough Duration Distribution",
        },
        books: {
            redo: "books re-read",
            durationDistributionUnit: "p.",
            totalSpecific: "Total Pages Read",
            durationDistribution: "Pages Distribution",
        },
        manga: {
            redo: "manga re-read",
            durationDistributionUnit: "ch.",
            totalSpecific: "Total Chapters Read",
            durationDistribution: "Chapters Distribution",
        },
    }

    return data[mediaType];
}


export const transformRatingToFeeling = (ratings: NamedValue[]) => {
    const validValues = [0, 2, 4, 6, 8, 10];
    const validIndices = validValues.map((value) => value * 2);
    const feelings = validValues.map((_, idx) => ({ name: idx * 2, value: 0 }));

    ratings.forEach((item, idx) => {
        if (item.value !== 0) {
            const closestValidIndex = validIndices.reduce((prev, curr) => {
                const prevDiff = Math.abs(idx - prev);
                const currDiff = Math.abs(idx - curr);
                if (currDiff < prevDiff || (currDiff === prevDiff && curr < prev)) {
                    return curr;
                }
                return prev;
            });

            const validIndexPosition = validIndices.indexOf(closestValidIndex);
            feelings[validIndexPosition].value += item.value;
        }
    });

    return feelings;
};
