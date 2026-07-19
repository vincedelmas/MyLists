import {Status} from "@/lib/utils/enums";
import {and, count, eq, SQL} from "drizzle-orm";
import {StatsCTE} from "@/lib/types/media-common.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AnyMediaSchemaConfig} from "@/lib/types/media.config.types";
import {Achievement, AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementHandler = (achievement: Achievement, userId?: number) => StatsCTE;


export interface MediaAchievements {
    getCte(achievement: Achievement, userId?: number): StatsCTE;

    getDefinitions(): readonly AchievementSeedData[];
}


export abstract class BaseMediaAchievements<TConfig extends AnyMediaSchemaConfig, TCodeName extends string> implements MediaAchievements {
    protected abstract readonly handlers: Record<TCodeName, AchievementHandler>;

    protected constructor(protected readonly config: TConfig) {
    }

    getCte(achievement: Achievement, userId?: number) {
        const handler = this.handlers[achievement.codeName as TCodeName];
        if (!handler) {
            throw new Error(`Invalid Achievement codeName: ${achievement.codeName}`);
        }

        return handler(achievement, userId);
    }

    getDefinitions() {
        return this.config.achievements;
    }

    protected count(condition: SQL, _achievement: Achievement, userId?: number) {
        const { listTable } = this.config;

        const baseCte = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable);

        return this.applyWhereConditionsAndGrouping(baseCte, [condition], userId);
    }

    protected specificGenre(achievement: Achievement, userId?: number) {
        const { mediaTable, listTable, genreTable } = this.config;

        const baseCte = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .innerJoin(genreTable, eq(mediaTable.id, genreTable.mediaId));

        const conditions = [eq(listTable.status, Status.COMPLETED)];
        if (achievement.value) conditions.push(eq(genreTable.name, achievement.value));

        return this.applyWhereConditionsAndGrouping(baseCte, conditions, userId);
    }

    protected applyWhereConditionsAndGrouping(cte: StatsCTE, baseConditions: SQL[], userId?: number) {
        const { listTable } = this.config;

        const conditions = userId
            ? [...baseConditions, eq(listTable.userId, userId)]
            : baseConditions;

        return cte
            .where(and(...conditions))
            .groupBy(listTable.userId)
            .as("calculation");
    }
}
