import {getImageUrl} from "@/lib/utils/image-url";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {FormattedError} from "@/lib/utils/error-classes";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";
import {MediaType, RatingSystemType, TagAction} from "@/lib/utils/enums";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {getLibraryCommunityActivity} from "@/lib/server/domain/media/shared/library/library-community-activity";
import {
    applyLibraryStatsTransition,
    LibraryActivityContribution,
    LibraryStatsSnapshot,
    recordLibraryEntryCreated,
    recordLibraryEntryTransition,
    removeLibraryEntryWithStats,
} from "@/lib/server/domain/media/shared/library/common-library.lifecycle";
import {
    findFollowedUsersLibraryMedia,
    findLibraryEntriesByCatalogItem,
    findLibraryUserMedia,
    getLibraryEntryTags,
} from "@/lib/server/domain/media/shared/library/library-shared-queries";
import {
    CommonLibraryEntry,
    CommonLibraryFields,
    createCommonLibraryEntry,
    editCommonLibraryTag,
    findCommonLibraryEntry,
    getCommonLibraryHistory,
    getCommonLibraryListHeader,
    getCommonLibraryTagNames,
    getCommonLibraryTagsView,
    prepareCommonLibraryCustomCover,
    synchronizeCommonLibraryProfileChannel,
    updateCommonLibraryEntry,
} from "@/lib/server/domain/media/shared/library/common-library.entries";


type CommonMediaEntry = {
    id: number;
    userId: number;
    favorite: boolean;
    rating: number | null;
    catalogItemId: number;
    comment: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    customCover: string | null;
};


type CreateCommonLibraryParams<K extends MediaType, TEntry extends CommonMediaEntry, TSpecific extends object> = {
    kind: K;
    toSpecificUserMedia: (entry: TEntry) => TSpecific;
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>;
    getCommunityContribution: (entry: TEntry) => { redo: number; specific: number; playtime: number };
};


export const createCommonLibrary = <
    K extends MediaType,
    TEntry extends CommonMediaEntry,
    TSpecific extends object,
>({ kind, findEntry, toSpecificUserMedia, getCommunityContribution }: CreateCommonLibraryParams<K, TEntry, TSpecific>) => {
    const toUserMedia = async (entry: TEntry, catalogItemId: number, ratingSystem: RatingSystemType, includeTags: boolean) => ({
        id: entry.id,
        ratingSystem,
        userId: entry.userId,
        rating: entry.rating,
        mediaId: catalogItemId,
        addedAt: entry.addedAt,
        comment: entry.comment,
        favorite: entry.favorite,
        lastUpdated: entry.updatedAt,
        tags: includeTags ? await getLibraryEntryTags(entry.id) : [],
        customCover: entry.customCover ? getImageUrl(`${kind}-covers`, entry.customCover) : null,
        ...toSpecificUserMedia(entry),
    });

    const updateFields = async (params: { userId: number; catalogItemId: number }, fields: CommonLibraryFields) => {
        const current = requireEntry(params.userId, params.catalogItemId);
        await updateCommonLibraryEntry(current.id, fields);

        const updated = requireEntry(current.userId, current.catalogItemId);
        await applyLibraryStatsTransition(kind, commonSnapshot(current), commonSnapshot(updated));

        return updated;
    };

    const requireEntry = (userId: number, catalogItemId: number) => {
        const entry = findCommonLibraryEntry(kind, userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    };

    return {
        getUserMediaHistory: (userId: number, catalogItemId: number) => {
            return getCommonLibraryHistory(kind, userId, catalogItemId);
        },

        getListHeader: (userId: number) => {
            return getCommonLibraryListHeader(kind, userId);
        },

        getTagsView: (access: MediaListAccessScope, search: SimpleSearch) => {
            return getCommonLibraryTagsView(kind, access.ownerId, search);
        },

        getTagNames: (userId: number) => {
            return getCommonLibraryTagNames(kind, userId);
        },

        synchronizeProfileChannel: (params: { userId: number; enabled: boolean; views: number }) => {
            return synchronizeCommonLibraryProfileChannel(kind, params);
        },

        editTag: (params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) => {
            return editCommonLibraryTag(kind, params);
        },

        updateRating: (params: { userId: number; catalogItemId: number; rating: number | null }) => {
            if (params.rating !== null && (params.rating < 0 || params.rating > 10)) {
                throw new FormattedError("Rating must be between 0 and 10.");
            }

            return updateFields(params, { rating: params.rating });
        },

        updateComment: (params: { userId: number; catalogItemId: number; comment: string | null }) => {
            return updateFields(params, { comment: params.comment });
        },

        updateFavorite: (params: { userId: number; catalogItemId: number; favorite: boolean }) => {
            return updateFields(params, { favorite: params.favorite });
        },

        updateCustomCover: async (userId: number, input: UpdateUserCustomCover) => {
            const current = requireEntry(userId, input.mediaId);
            const customCover = await prepareCommonLibraryCustomCover(kind, input);

            return updateFields(
                { userId: current.userId, catalogItemId: current.catalogItemId },
                { customCover },
            );
        },

        findUserMedia: (userId: number | undefined, catalogItemId: number) => {
            return findLibraryUserMedia(userId, catalogItemId, findEntry, toUserMedia);
        },

        findFollowedUsersMedia: (viewerId: number | undefined, catalogItemId: number) => {
            return findFollowedUsersLibraryMedia(kind, viewerId, catalogItemId, findEntry, toUserMedia);
        },

        getCommunityActivity: (viewerId: number | undefined, catalogItemId: number, search: SearchType) => {
            return getLibraryCommunityActivity({
                kind,
                search,
                viewerId,
                catalogItemId,
                findEntry,
                getContribution: getCommunityContribution,
                toUserMedia: (entry, mediaId, ratingSystem) => toUserMedia(entry, mediaId, ratingSystem, false),
            });
        },

        findEntriesByCatalogItem: (catalogItemId: number) => {
            return findLibraryEntriesByCatalogItem(catalogItemId, findEntry);
        },

        applyStatsTransition: (before?: LibraryStatsSnapshot, after?: LibraryStatsSnapshot) => {
            return applyLibraryStatsTransition(kind, before, after);
        },

        recordCreatedEntry: (params: { entryId: number; snapshot: LibraryStatsSnapshot; activity: LibraryActivityContribution }) => {
            return recordLibraryEntryCreated(kind, params);
        },

        recordEntryTransition: (params: Parameters<typeof recordLibraryEntryTransition>[1]) => {
            return recordLibraryEntryTransition(kind, params);
        },

        removeEntry: (entryId: number, snapshot: LibraryStatsSnapshot) => {
            return removeLibraryEntryWithStats(kind, entryId, snapshot);
        },

        entries: {
            create: createCommonLibraryEntry,
            update: updateCommonLibraryEntry,
        },
    };
};


const commonSnapshot = (entry: CommonLibraryEntry): LibraryStatsSnapshot => ({
    time: 0,
    redo: 0,
    specific: 0,
    userId: entry.userId,
    status: entry.status,
    rating: entry.rating ?? 0,
    favorited: Number(entry.favorite),
    commented: Number(!!entry.comment),
    rated: Number(entry.rating !== null),
});
