import {SearchType} from "@/lib/schemas";
import {and, desc, eq, ne, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";
import {followers, libraryEntry, profileMediaChannel, user} from "@/lib/server/database/schema";


export type CommunityActivityContribution = {
    redo: number;
    specific: number;
    playtime: number;
};


type CommunityActivityParams<K extends MediaType, TEntry, TUserMedia extends object> = {
    kind: K;
    viewerId: number | undefined;
    catalogItemId: number;
    search: SearchType;
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>;
    toUserMedia: (entry: TEntry, catalogItemId: number, ratingSystem: typeof user.$inferSelect.ratingSystem) => Promise<TUserMedia>;
    getContribution: (entry: TEntry) => CommunityActivityContribution;
};


/**
 * Shared community visibility, pagination and aggregation policy. Media repositories
 * retain ownership of entry hydration and their progress-specific contributions.
 */
export const getLibraryCommunityActivity = async <K extends MediaType, TEntry, TUserMedia extends object>(props: CommunityActivityParams<K, TEntry, TUserMedia>) => {
    const { kind, viewerId, catalogItemId, search, findEntry, toUserMedia, getContribution } = props;
    const pagination = resolvePagination({ page: search.page, perPage: search.perPage, defaultPerPage: 8, maxPerPage: 50 });

    const audienceCondition = viewerId
        ? sql`(
            ${user.privacy} IN (${PrivacyType.PUBLIC}, ${PrivacyType.RESTRICTED})
            OR ${user.id} = ${viewerId}
            OR EXISTS (
                SELECT 1 FROM ${followers} AS community_follow
                WHERE community_follow.follower_id = ${viewerId}
                    AND community_follow.followed_id = ${user.id}
                    AND community_follow.status = ${SocialState.ACCEPTED}
            )
        )`
        : eq(user.privacy, PrivacyType.PUBLIC);

    const visibleConditions = and(
        audienceCondition,
        ne(user.name, "DemoProfile"),
        eq(libraryEntry.catalogItemId, catalogItemId),
    );

    const baseQuery = () => getDbClient()
        .select({
            userId: user.id,
            name: user.name,
            image: user.image,
            rating: libraryEntry.rating,
            status: libraryEntry.status,
            ratingSystem: user.ratingSystem,
            favorite: libraryEntry.favorite,
        })
        .from(libraryEntry)
        .innerJoin(user, eq(user.id, libraryEntry.userId))
        .innerJoin(profileMediaChannel, and(
            eq(profileMediaChannel.userId, libraryEntry.userId),
            eq(profileMediaChannel.kind, kind),
            eq(profileMediaChannel.enabled, true),
        ))
        .where(visibleConditions);

    const [allRows, pageRows] = await Promise.all([
        baseQuery(),
        baseQuery()
            .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`))
            .limit(pagination.limit)
            .offset(pagination.offset),
    ]);

    const entries = await Promise.all(allRows.map(async ({ userId }) => ({
        userId,
        entry: await findEntry(userId, catalogItemId),
    })));

    const completeEntries: TEntry[] = [];
    const entriesByUserId = new Map(entries.map(({ userId, entry }) => [userId, entry]));

    for (const { entry } of entries) {
        if (entry !== undefined) completeEntries.push(entry as TEntry);
    }

    const items = await Promise.all(pageRows.map(async (row) => {
        const entry = entriesByUserId.get(row.userId);
        if (!entry) return;

        const userMedia = await toUserMedia(entry, catalogItemId, row.ratingSystem);

        return {
            kind,
            id: row.userId,
            name: row.name,
            image: row.image,
            ratingSystem: row.ratingSystem,
            userMedia: { ...userMedia, kind, comment: null },
        };
    }));

    const total = allRows.length;
    const contributions = completeEntries.map(getContribution);
    const ratings = allRows.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);

    return {
        kind,
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        items: items.filter((item): item is NonNullable<typeof item> => item !== undefined),
        pages: Math.ceil(total / pagination.perPage),
        stats: {
            total,
            likedCount: allRows.filter(({ favorite }) => favorite).length,
            completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
            totalRedo: contributions.reduce((sum, contribution) => sum + contribution.redo, 0),
            totalSpecific: contributions.reduce((sum, contribution) => sum + contribution.specific, 0),
            totalPlaytime: contributions.reduce((sum, contribution) => sum + contribution.playtime, 0),
            averageRating: ratings.length > 0
                ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
                : null,
        },
    };
};
