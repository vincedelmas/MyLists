import {Status} from "@/lib/utils/enums";
import {and, count, eq, isNotNull, ne, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {AnyMediaRepositoryDefinition} from "@/lib/media-definitions/base/media.definition.server";
import type {AchievementCalculation, AchievementCalculationRow} from "@/lib/server/domain/achievements/achievement-catalog";


export function pickTopPerUser(rows: { userId: number; label: string | null; count: number }[]): AchievementCalculationRow[] {
    const bestByUser = new Map<number, AchievementCalculationRow>();

    for (const row of rows) {
        if (!row.label) continue;

        const current = bestByUser.get(row.userId);
        if (!current || row.count > current.value || (row.count === current.value && row.label < (current.label ?? ""))) {
            bestByUser.set(row.userId, { userId: row.userId, value: row.count, label: row.label });
        }
    }

    return [...bestByUser.values()];
}


export const createAchievementQueries = <T extends AnyMediaRepositoryDefinition>(definition: T) => {
    const { mediaTable, listTable, genreTable } = definition.tables;

    const userFilter = (userId?: number) => (userId !== undefined ? eq(listTable.userId, userId) : undefined);

    const countList = (condition: SQL): AchievementCalculation => (userId) => {
        return getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId),
            }).from(listTable)
            .where(and(condition, userFilter(userId)))
            .groupBy(listTable.userId)
            .all();
    };

    const countCompletedGenre = (genreName: string): AchievementCalculation => (userId) => {
        return getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId),
            }).from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .innerJoin(genreTable, eq(mediaTable.id, genreTable.mediaId))
            .where(and(
                eq(listTable.status, Status.COMPLETED),
                eq(genreTable.name, genreName),
                userFilter(userId),
            )).groupBy(listTable.userId)
            .all();
    };

    const countNonEmptyComment = (): AchievementCalculation => countList(and(isNotNull(listTable.comment), ne(listTable.comment, ""))!);

    return {
        countList,
        userFilter,
        countCompletedGenre,
        countNonEmptyComment,
    };
};
