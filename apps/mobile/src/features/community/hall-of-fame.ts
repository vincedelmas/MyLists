import type {api, MediaType} from "../../lib/api-client";
import {calculateMediaLevel} from "@/lib/utils/media/level";


export type RankedUser = Awaited<ReturnType<typeof api.hallOfFame>>["items"][number];


export type PersonalRanks = Awaited<ReturnType<typeof api.hallOfFame>>["userRanks"];


export type RankingCategory = "normalized" | "profile" | MediaType;


export const getRankingLevel = (user: RankedUser, category: RankingCategory) => {
    if (category === "normalized" || category === "profile") return Math.floor(calculateMediaLevel(user.totalTime));
    const setting = user.settings.find(item => item.mediaType === category);

    return setting?.active ? Math.floor(calculateMediaLevel(setting.timeSpent)) : null;
};


export const getPersonalRanking = (ranks: PersonalRanks, category: RankingCategory) => {
    if (category !== "normalized" && category !== "profile") return ranks.find(rank => rank.mediaType === category);

    return ranks.filter(rank => rank.active && rank.rank !== null && rank.percent !== null)
        .sort((a, b) => a.percent! - b.percent! || a.rank! - b.rank!)[0];
};
