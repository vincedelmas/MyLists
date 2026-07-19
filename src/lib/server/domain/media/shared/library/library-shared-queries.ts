import {alias} from "drizzle-orm/sqlite-core";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, SocialState, Status} from "@/lib/utils/enums";
import {and, asc, eq, inArray, isNotNull, like, notInArray, SQL} from "drizzle-orm";
import {catalogGenre, catalogItem, catalogItemGenre, followers, libraryEntry, libraryEntryTag, libraryTag, profileMediaChannel, user,} from "@/lib/server/database/schema";


type RatingSystem = typeof user.$inferSelect.ratingSystem;

export type CommonLibraryListArgs = {
    search?: string;
    favorite?: boolean;
    comment?: boolean;
    status?: readonly Status[];
    tags?: readonly string[];
    genres?: readonly string[];
    hideCommon?: boolean;
};


export const getLibraryEntryTags = (libraryEntryId: number) => {
    return getDbClient()
        .select({ name: libraryTag.name })
        .from(libraryEntryTag)
        .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
        .where(eq(libraryEntryTag.libraryEntryId, libraryEntryId))
        .orderBy(asc(libraryTag.name));
};

export const findLibraryUserMedia = async <TEntry, TUserMedia>(
    userId: number | undefined,
    catalogItemId: number,
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>,
    toUserMedia: (
        entry: TEntry,
        catalogItemId: number,
        ratingSystem: RatingSystem,
        includeTags: boolean,
    ) => Promise<TUserMedia>,
) => {
    if (!userId) return null;
    const [entry, owner] = await Promise.all([
        findEntry(userId, catalogItemId),
        getDbClient().select({ ratingSystem: user.ratingSystem }).from(user).where(eq(user.id, userId)).get(),
    ]);
    if (!entry || !owner) return null;
    return toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
};

export const findFollowedUsersLibraryMedia = async <TEntry, TUserMedia>(
    kind: MediaType,
    viewerId: number | undefined,
    catalogItemId: number,
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>,
    toUserMedia: (
        entry: TEntry,
        catalogItemId: number,
        ratingSystem: RatingSystem,
        includeTags: boolean,
    ) => Promise<TUserMedia>,
) => {
    if (!viewerId) return [];
    const followedOwners = await getDbClient()
        .select({ id: user.id, name: user.name, image: user.image, ratingSystem: user.ratingSystem })
        .from(followers)
        .innerJoin(user, eq(user.id, followers.followedId))
        .innerJoin(libraryEntry, and(
            eq(libraryEntry.userId, followers.followedId),
            eq(libraryEntry.catalogItemId, catalogItemId),
        ))
        .innerJoin(profileMediaChannel, and(
            eq(profileMediaChannel.userId, followers.followedId),
            eq(profileMediaChannel.kind, kind),
            eq(profileMediaChannel.enabled, true),
        ))
        .where(and(eq(followers.followerId, viewerId), eq(followers.status, SocialState.ACCEPTED)))
        .orderBy(asc(user.name));

    const results = await Promise.all(followedOwners.map(async (owner) => {
        const entry = await findEntry(owner.id, catalogItemId);
        if (!entry) return;
        return {
            ...owner,
            userMedia: await toUserMedia(entry, catalogItemId, owner.ratingSystem, false),
        };
    }));
    return results.filter((result): result is NonNullable<typeof result> => !!result);
};

export const findLibraryEntriesByCatalogItem = async <TEntry>(
    catalogItemId: number,
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>,
) => {
    const owners = await getDbClient()
        .select({ userId: libraryEntry.userId })
        .from(libraryEntry)
        .where(eq(libraryEntry.catalogItemId, catalogItemId));
    const entries = await Promise.all(owners.map(({ userId }) => findEntry(userId, catalogItemId)));
    return entries.filter((entry): entry is Exclude<typeof entry, undefined> => entry !== undefined);
};

export const getCommonLibraryListConditions = (kind: MediaType, currentUserId: number | undefined, ownerId: number, args: CommonLibraryListArgs) => {
    const conditions: SQL[] = [eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, kind)];

    if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
    if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
    if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
    if (args.status?.length) conditions.push(inArray(libraryEntry.status, [...args.status]));
    if (args.tags?.length) {
        conditions.push(inArray(
            libraryEntry.id,
            getDbClient()
                .select({ libraryEntryId: libraryEntryTag.libraryEntryId })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryTag.name, [...args.tags])),
        ));
    }
    if (args.genres?.length) {
        conditions.push(inArray(
            catalogItem.id,
            getDbClient()
                .select({ catalogItemId: catalogItemGenre.catalogItemId })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(inArray(catalogGenre.name, [...args.genres])),
        ));
    }
    if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
        const currentEntry = alias(libraryEntry, "current_viewer_library_entry");
        conditions.push(notInArray(
            catalogItem.id,
            getDbClient()
                .select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry)
                .where(eq(currentEntry.userId, currentUserId)),
        ));
    }

    return conditions;
};

export const getLibraryGenresAndTags = async (kind: MediaType, ownerId: number) => {
    const [genres, tags] = await Promise.all([
        getDbClient()
            .selectDistinct({ name: catalogGenre.name })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, kind)))
            .orderBy(asc(catalogGenre.name)),
        getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, kind)))
            .orderBy(asc(libraryTag.name)),
    ]);
    return { genres, tags };
};

export const getLibraryListItemRelations = async (entryIds: number[], catalogItemIds: number[], currentUserId: number | undefined, ownerId: number) => {
    const [tags, commonEntries] = await Promise.all([
        getDbClient()
            .select({
                libraryEntryId: libraryEntryTag.libraryEntryId,
                id: libraryTag.id,
                name: libraryTag.name,
            })
            .from(libraryEntryTag)
            .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
            .where(inArray(libraryEntryTag.libraryEntryId, entryIds))
            .orderBy(asc(libraryTag.name)),
        currentUserId && currentUserId !== ownerId
            ? getDbClient()
                .select({ catalogItemId: libraryEntry.catalogItemId })
                .from(libraryEntry)
                .where(and(
                    eq(libraryEntry.userId, currentUserId),
                    inArray(libraryEntry.catalogItemId, catalogItemIds),
                ))
            : [],
    ]);
    
    return {
        tags,
        commonIds: new Set(commonEntries.map(({ catalogItemId }) => catalogItemId)),
    };
};
