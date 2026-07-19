import {MediaType} from "@/lib/utils/enums";
import {StatsCTE} from "@/lib/types/media-common.types";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementCalculation = (achievement: Achievement) => StatsCTE;
type AchievementEntry = Omit<AchievementSeedData, "codeName" | "mediaType"> & { calculate: AchievementCalculation };


type AchievementCatalogOptions<TMediaType extends MediaType, TEntries extends Record<string, AchievementEntry>> = {
    entries: TEntries;
    mediaType: TMediaType;
};


export const defineAchievementCatalog = <
    TMediaType extends MediaType,
    TEntries extends Record<string, AchievementEntry>,
>({ mediaType, entries }: AchievementCatalogOptions<TMediaType, TEntries>) => {
    const definitions: AchievementSeedData[] = Object.entries(entries).map(([codeName, entry]) => {
        const { calculate: _calculate, ...definition } = entry;

        return {
            ...definition,
            codeName,
            mediaType,
        };
    });

    return ({
        mediaType,
        definitions,
        buildProgressQuery(achievement: Achievement) {
            if (achievement.mediaType !== mediaType) {
                throw new Error(`Achievement ${achievement.codeName} belongs to ${achievement.mediaType}, not ${mediaType}`);
            }

            const entry = entries[achievement.codeName];
            if (!entry) throw new Error(`Invalid achievement codeName: ${achievement.codeName}`);

            return entry.calculate(achievement);
        },
    });
}


export type AchievementCatalog = ReturnType<typeof defineAchievementCatalog>;
