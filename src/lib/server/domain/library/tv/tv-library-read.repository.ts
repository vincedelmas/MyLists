import {and, asc, desc, eq, ne, sql} from "drizzle-orm";
import {MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";
import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvCommunityActivityPage} from "@/lib/contracts/media/community";
import {TvLibraryEntry, TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {consumedEpisodeCount, totalTvRewatchCount} from "@/lib/server/domain/library/tv/tv-progress";
import {
    followers,
    catalogItem,
    libraryChange,
    libraryEntry,
    libraryEntryTag,
    libraryTag,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";


/** Projects the TV library into the detail-page contract. */
export class TvLibraryReadRepository<K extends TvMediaType = TvMediaType> {
    private readonly library = new TvLibraryRepository();

    constructor(private readonly kind: K) {}

    async getUserMediaHistory(userId: number, catalogItemId: number) {
        const rows = await getDbClient()
            .select({
                id: libraryChange.id,
                userId: libraryEntry.userId,
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                mediaType: catalogItem.kind,
                updateType: libraryChange.updateType,
                payload: libraryChange.payload,
                timestamp: libraryChange.occurredAt,
            })
            .from(libraryChange)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, this.kind),
                eq(catalogItem.id, catalogItemId),
            ))
            .orderBy(desc(libraryChange.occurredAt), desc(libraryChange.id));

        return rows.map((row) => ({
            ...row,
            id: row.id,
            payload: row.payload,
        }));
    }

    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        if (!userId) return null;

        const [entry, owner] = await Promise.all([
            this.library.findEntry(userId, catalogItemId),
            getDbClient()
                .select({ ratingSystem: user.ratingSystem })
                .from(user)
                .where(eq(user.id, userId))
                .get(),
        ]);
        if (!entry || !owner) return null;

        return this.toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        if (!viewerId) return [];

        const followedOwners = await getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                ratingSystem: user.ratingSystem,
            })
            .from(followers)
            .innerJoin(user, eq(user.id, followers.followedId))
            .innerJoin(libraryEntry, and(
                eq(libraryEntry.userId, followers.followedId),
                eq(libraryEntry.catalogItemId, catalogItemId),
            ))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, followers.followedId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(
                eq(followers.followerId, viewerId),
                eq(followers.status, SocialState.ACCEPTED),
            ))
            .orderBy(asc(user.name));

        const results = await Promise.all(followedOwners.map(async (owner) => {
            const entry = await this.library.findEntry(owner.id, catalogItemId);
            if (!entry) return;
            return {
                ...owner,
                userMedia: await this.toUserMedia(entry, catalogItemId, owner.ratingSystem, false),
            };
        }));
        return results.filter((result): result is NonNullable<typeof result> => !!result);
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<TvCommunityActivityPage<K>> {
        const pagination = resolvePagination({
            page: search.page,
            perPage: search.perPage,
            defaultPerPage: 8,
            maxPerPage: 50,
        });

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
            eq(libraryEntry.catalogItemId, catalogItemId),
            ne(user.name, "DemoProfile"),
            audienceCondition,
        );
        const baseSelection = {
            entryId: libraryEntry.id,
            userId: user.id,
            name: user.name,
            image: user.image,
            ratingSystem: user.ratingSystem,
            favorite: libraryEntry.favorite,
            rating: libraryEntry.rating,
            status: libraryEntry.status,
        };
        const baseQuery = () => getDbClient()
            .select(baseSelection)
            .from(libraryEntry)
            .innerJoin(user, eq(user.id, libraryEntry.userId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryEntry.userId),
                eq(profileMediaChannel.kind, this.kind),
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

        const entries = await Promise.all(allRows.map(({ userId }) => this.library.findEntry(userId, catalogItemId)));
        const completeEntries = entries.filter((entry): entry is TvLibraryEntry => !!entry);
        const totalSpecific = completeEntries.reduce(
            (total, entry) => total + consumedEpisodeCount(entry.progress, entry.seasons),
            0,
        );
        const totalRedo = completeEntries.reduce((total, entry) => total + totalTvRewatchCount(entry.progress), 0);
        const ratings = allRows.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
        const items = await Promise.all(pageRows.map(async (row) => {
            const entry = await this.library.findEntry(row.userId, catalogItemId);
            if (!entry) return;
            const userMedia = await this.toUserMedia(entry, catalogItemId, row.ratingSystem, false);
            return {
                kind: this.kind,
                id: row.userId,
                name: row.name,
                image: row.image,
                ratingSystem: row.ratingSystem,
                userMedia: { ...userMedia, kind: this.kind, comment: null },
            };
        }));
        const total = allRows.length;

        return {
            kind: this.kind,
            page: pagination.page,
            items: items.filter((item): item is NonNullable<typeof item> => !!item),
            total,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
            stats: {
                total,
                totalRedo,
                likedCount: allRows.filter(({ favorite }) => favorite).length,
                totalSpecific,
                totalPlaytime: 0,
                completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
                averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
            },
        };
    }

    private async toUserMedia(
        entry: TvLibraryEntry,
        catalogItemId: number,
        ratingSystem: typeof user.$inferSelect.ratingSystem,
        includeTags: boolean,
    ) {
        const tags = includeTags
            ? await getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(eq(libraryEntryTag.libraryEntryId, entry.id))
                .orderBy(asc(libraryTag.name))
            : undefined;

        const userMedia = {
            id: entry.id,
            userId: entry.userId,
            mediaId: catalogItemId,
            status: entry.progress.status,
            favorite: entry.favorite,
            comment: entry.comment,
            rating: entry.rating,
            customCover: entry.customCover ? getImageUrl(`${this.kind}-covers`, entry.customCover) : null,
            addedAt: entry.addedAt,
            lastUpdated: entry.updatedAt,
            currentSeason: entry.progress.currentSeason,
            currentEpisode: entry.progress.currentEpisode,
            watchedEpisodes: entry.progress.watchedEpisodes,
            rewatches: entry.progress.rewatches,
        };

        return { ...userMedia, ratingSystem, tags: tags ?? [] };
    }
}


export const isTvKind = (kind: string): kind is TvMediaType => (
    kind === MediaType.SERIES || kind === MediaType.ANIME
);
