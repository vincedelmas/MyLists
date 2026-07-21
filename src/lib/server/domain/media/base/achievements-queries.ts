import {Status} from "@/lib/utils/enums";
import {and, count, eq, SQL} from "drizzle-orm";
import {StatsCTE} from "@/lib/types/media-common.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementCalculation} from "@/lib/server/domain/achievements/achievement-catalog";
import {AnyMediaRepositoryDefinition} from "@/lib/server/domain/media/base/media-definition";


export const createAchievementQueries = <T extends AnyMediaRepositoryDefinition>(definition: T) => {
    const { mediaTable, listTable, genreTable } = definition.tables;

    const applyConditionsAndGroup = (query: StatsCTE, conditions: SQL[]) => {
        return query
            .where(and(...conditions))
            .groupBy(listTable.userId)
            .as("calculation");
    }

    const countList = (condition: SQL): AchievementCalculation => () => {
        const query = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable);

        return applyConditionsAndGroup(query, [condition]);
    };

    const countCompletedGenre: AchievementCalculation = (achievement) => {
        const query = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .innerJoin(genreTable, eq(mediaTable.id, genreTable.mediaId));

        const conditions = [eq(listTable.status, Status.COMPLETED)];
        if (achievement.value) conditions.push(eq(genreTable.name, achievement.value));

        return applyConditionsAndGroup(query, conditions);
    };

    return {
        countList,
        countCompletedGenre,
        applyConditionsAndGroup,
    };
};
