import {MediaType} from "@/lib/utils/enums";
import {StatsCTE} from "@/lib/types/media-common.types";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementCalculation = (achievement: Achievement) => StatsCTE;


export type AchievementCalculations<TDefinitions extends readonly AchievementSeedData[]> = {
    [TCodeName in TDefinitions[number]["codeName"]]: AchievementCalculation;
};


type AchievementCatalogOptions<
    TMediaType extends MediaType,
    TDefinitions extends readonly (AchievementSeedData & { mediaType: TMediaType })[],
> = {
    mediaType: TMediaType;
    definitions: TDefinitions;
    calculations: AchievementCalculations<TDefinitions>;
};


export const defineAchievementCatalog = <
    const TMediaType extends MediaType,
    const TDefinitions extends readonly (AchievementSeedData & { mediaType: TMediaType })[],
>({ mediaType, definitions, calculations }: AchievementCatalogOptions<TMediaType, TDefinitions>) => {
    return ({
        mediaType,
        definitions,
        buildProgressQuery(achievement: Achievement) {
            if (achievement.mediaType !== mediaType) {
                throw new Error(`Achievement ${achievement.codeName} belongs to ${achievement.mediaType}, not ${mediaType}`);
            }

            const calculation = calculations[achievement.codeName as TDefinitions[number]["codeName"]];
            if (!calculation) {
                throw new Error(`Invalid achievement codeName: ${achievement.codeName}`);
            }

            return calculation(achievement);
        },
    });
}


export type AchievementCatalog = ReturnType<typeof defineAchievementCatalog>;
