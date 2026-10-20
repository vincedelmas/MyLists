import type {SearchType} from "@/lib/schemas";
import {SocialState, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {followers, user, userMediaSettings} from "@/lib/server/database/schema";
import {and, asc, count, desc, eq, getTableColumns, like, sql} from "drizzle-orm";
import {type Actor, communityProfileVisibilityCondition} from "@/lib/server/authorization";
import type {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import type {MediaCommunityActivityStats, UserFollowsMediaData} from "@/lib/types/user-media.types";


export const createMediaCommunityQueries = <TDef extends AnyServerMediaDefinition>(definition: TDef) => {
    const { mediaType } = definition.identity;
    const { tables: { listTable }, communityActivity: { aggregates } } = definition.repository;

    return {
        async getMediaCommunityActivity(actor: Actor, mediaId: number, search: SearchType) {
            const totalRedo = aggregates.totalRedo ?? sql<number>`0`;
            const totalSpecific = aggregates.totalSpecific ?? sql<number>`0`;
            const totalPlaytime = aggregates.totalPlaytime ?? sql<number>`0`;

            const { page, perPage, offset, limit } = resolvePagination({
                maxPerPage: 50,
                page: search.page,
                defaultPerPage: 8,
                perPage: search.perPage,
            });

            const conditions = and(
                eq(listTable.mediaId, mediaId),
                communityProfileVisibilityCondition(actor),
                search.search ? like(user.name, `%${search.search}%`) : undefined,
            );

            const statsQuery = getDbClient()
                .select({
                    totalRedo,
                    totalSpecific,
                    totalPlaytime,
                    total: count(listTable.id),
                    averageRating: sql<number | null>`AVG(${listTable.rating})`,
                    likedCount: sql<number>`COALESCE(SUM(CASE WHEN ${listTable.favorite} = 1 THEN 1 ELSE 0 END), 0)`,
                    completedCount: sql<number>`COALESCE(SUM(CASE WHEN ${listTable.status} = ${Status.COMPLETED} THEN 1 ELSE 0 END), 0)`,
                })
                .from(listTable)
                .innerJoin(user, eq(user.id, listTable.userId))
                .innerJoin(userMediaSettings, and(
                    eq(userMediaSettings.userId, listTable.userId),
                    eq(userMediaSettings.mediaType, mediaType),
                    eq(userMediaSettings.active, true),
                ))
                .where(conditions)
                .get();

            const itemsQuery = getDbClient()
                .select({
                    id: user.id,
                    name: user.name,
                    image: user.image,
                    userMedia: {
                        ...getTableColumns(listTable),
                        comment: sql<string | null>`NULL`,
                    },
                    ratingSystem: user.ratingSystem,
                })
                .from(listTable)
                .innerJoin(user, eq(user.id, listTable.userId))
                .innerJoin(userMediaSettings, and(
                    eq(userMediaSettings.active, true),
                    eq(userMediaSettings.userId, listTable.userId),
                    eq(userMediaSettings.mediaType, mediaType),
                ))
                .where(conditions)
                .orderBy(desc(sql`COALESCE(${listTable.lastUpdated}, ${listTable.addedAt})`))
                .limit(limit)
                .offset(offset);

            const [stats, items] = await Promise.all([statsQuery, itemsQuery]);
            const total = stats?.total ?? 0;

            return {
                page,
                items,
                total,
                perPage,
                pages: Math.ceil(total / perPage),
                stats: {
                    total,
                    totalRedo: stats?.totalRedo ?? 0,
                    likedCount: stats?.likedCount ?? 0,
                    totalSpecific: stats?.totalSpecific ?? 0,
                    totalPlaytime: stats?.totalPlaytime ?? 0,
                    completedCount: stats?.completedCount ?? 0,
                    averageRating: stats?.averageRating ?? null,
                } satisfies MediaCommunityActivityStats,
            };
        },

        async getUserFollowsMediaData(userId: number | undefined, mediaId: number): Promise<UserFollowsMediaData<TDef["repository"]["tables"]["listTable"]["$inferSelect"]>[]> {
            if (!userId) return [];

            const inFollowsLists = await getDbClient()
                .select({
                    id: user.id,
                    name: user.name,
                    image: user.image,
                    userMedia: listTable,
                    ratingSystem: user.ratingSystem,
                })
                .from(followers)
                .innerJoin(user, eq(user.id, followers.followedId))
                .innerJoin(listTable, eq(listTable.userId, followers.followedId))
                .innerJoin(userMediaSettings, and(
                    eq(userMediaSettings.userId, listTable.userId),
                    eq(userMediaSettings.mediaType, mediaType),
                    eq(userMediaSettings.active, true),
                ))
                .where(and(eq(followers.followerId, userId), eq(followers.status, SocialState.ACCEPTED), eq(listTable.mediaId, mediaId)))
                .orderBy(asc(user.name));

            return inFollowsLists;
        },
    };
};
