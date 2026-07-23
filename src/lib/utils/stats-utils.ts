import {NamedValue} from "@/lib/types/stats.types";


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
