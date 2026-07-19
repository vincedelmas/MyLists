import {Status} from "@/lib/utils/enums";
import {and, count, eq, SQL} from "drizzle-orm";
import {StatsCTE} from "@/lib/types/media-common.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AnyMediaSchemaConfig} from "@/lib/types/media.config.types";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementHandler = (achievement: Achievement, userId?: number) => StatsCTE;


export interface MediaAchievementHelpers {
    specificGenre: AchievementHandler;

    count(condition: SQL): AchievementHandler;

    applyWhereConditionsAndGrouping(cte: StatsCTE, baseConditions: SQL[], userId?: number): StatsCTE;
}


type CreateMediaAchievementsOptions<TConfig extends AnyMediaSchemaConfig, TCodeName extends string> = {
    config: TConfig;
    definitions: readonly (AchievementSeedData & { mediaType: TConfig["mediaType"] })[];
    createHandlers: (helpers: MediaAchievementHelpers) => Record<TCodeName, AchievementHandler>;
};


const createMediaAchievementHelpers = <TConfig extends AnyMediaSchemaConfig>(config: TConfig): MediaAchievementHelpers => {
    const countAchievement = (condition: SQL): AchievementHandler => (_achievement, userId) => {
        const baseCte = getDbClient()
            .select({
                userId: config.listTable.userId,
                value: count(config.listTable.mediaId).as("value"),
            })
            .from(config.listTable);

        return applyWhereConditionsAndGrouping(baseCte, [condition], userId);
    };

    const specificGenre: AchievementHandler = (achievement, userId) => {
        const baseCte = getDbClient()
            .select({
                userId: config.listTable.userId,
                value: count(config.listTable.mediaId).as("value"),
            })
            .from(config.listTable)
            .innerJoin(config.mediaTable, eq(config.listTable.mediaId, config.mediaTable.id))
            .innerJoin(config.genreTable, eq(config.mediaTable.id, config.genreTable.mediaId));

        const conditions = [eq(config.listTable.status, Status.COMPLETED)];
        if (achievement.value) conditions.push(eq(config.genreTable.name, achievement.value));

        return applyWhereConditionsAndGrouping(baseCte, conditions, userId);
    };

    const applyWhereConditionsAndGrouping = (cte: StatsCTE, baseConditions: SQL[], userId?: number) => {
        const conditions = userId
            ? [...baseConditions, eq(config.listTable.userId, userId)]
            : baseConditions;

        return cte
            .where(and(...conditions))
            .groupBy(config.listTable.userId)
            .as("calculation");
    };

    return {
        specificGenre,
        count: countAchievement,
        applyWhereConditionsAndGrouping,
    };
};


export const createMediaAchievements = <
    TConfig extends AnyMediaSchemaConfig,
    TCodeName extends string
>({ config, definitions, createHandlers }: CreateMediaAchievementsOptions<TConfig, TCodeName>) => {
    const handlers = createHandlers(createMediaAchievementHelpers(config));

    return {
        getCte(achievement: Achievement, userId?: number) {
            const handler = handlers[achievement.codeName as TCodeName];
            if (!handler) {
                throw new Error(`Invalid Achievement codeName: ${achievement.codeName}`);
            }

            return handler(achievement, userId);
        },

        getDefinitions() {
            return definitions;
        },
    };
};


export type MediaAchievements = ReturnType<typeof createMediaAchievements>;
