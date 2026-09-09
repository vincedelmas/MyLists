import {notFound} from "@tanstack/react-router";
import {Actor} from "@/lib/server/authorization";
import {DeltaStats} from "@/lib/types/stats.types";
import type {AddedMediaDetails} from "@/lib/types/media-common.types";
import {Tag} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {MyListsCSVImport} from "@/lib/types/imports.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {JobType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import type {MediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {MYLISTS_CSV_VERSION} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {createMediaTagQueries} from "@/lib/server/domain/media/base/media-tag.queries";
import {createMediaListQueries} from "@/lib/server/domain/media/base/media-list.queries";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/server/core/images/image-saver";
import {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {createMediaCommunityQueries} from "@/lib/server/domain/media/base/media-community.queries";
import {UpdateHandlerFn, UpdateUserMediaDetails, UserMediaWithTags} from "@/lib/types/user-media.types";
import {MediaListArgs, Pagination, SearchType, SimpleSearch, UpdateUserCustomCover, UpdateUserMedia} from "@/lib/schemas";


type MediaServiceRepository<TDef extends AnyServerMediaDefinition> = MediaQueries<TDef> & {
    addMediaToUserList(userId: number, media: TDef["repository"]["tables"]["mediaTable"]["$inferSelect"], status: Status): TDef["repository"]["tables"]["listTable"]["$inferSelect"];
    findAllAssociatedDetails(mediaId: number): Promise<(TDef["repository"]["tables"]["mediaTable"]["$inferSelect"] & AddedMediaDetails) | undefined>;
};


type MediaUpdateHandlers<TDef extends AnyServerMediaDefinition> = Partial<Record<
    UpdateType,
    UpdateHandlerFn<TDef["repository"]["tables"]["listTable"]["$inferSelect"], any, TDef["repository"]["tables"]["mediaTable"]["$inferSelect"]>
>>;


export function createMediaService<TDef extends AnyServerMediaDefinition>(
    repository: MediaServiceRepository<TDef>,
    definition: TDef,
    handlers: MediaUpdateHandlers<TDef>,
) {
    const { identity, ingestion, service: servicePolicy } = definition;

    const tagQueries = createMediaTagQueries(definition.repository);
    const communityQueries = createMediaCommunityQueries(definition);
    const listQueries = createMediaListQueries(definition.repository);

    const updateHandlers: MediaUpdateHandlers<TDef> = {
        [UpdateType.RATING]: createSimpleUpdateHandler("rating"),
        [UpdateType.COMMENT]: createSimpleUpdateHandler("comment"),
        [UpdateType.FAVORITE]: createSimpleUpdateHandler("favorite"),
        ...handlers,
    };

    function getPopularMediaRefs() {
        return repository.getPopularMediaRefs();
    }

    async function getUserFavorites(userId: number, limit = 7) {
        return listQueries.getUserFavorites(userId, limit);
    }

    async function searchUserListByName(userId: number, query: string, limit?: number) {
        return listQueries.searchUserListByName(userId, query, limit);
    }

    async function getUpcomingMedia(userId?: number, maxAWeek?: boolean) {
        return repository.getUpcomingMedia(userId, maxAWeek);
    }

    async function searchMediadleSuggestion(query: string) {
        return repository.searchMediadleSuggestion(query);
    }

    async function searchByName(query: string, limit?: number) {
        return repository.searchByName(query, limit);
    }

    async function getListFilters(userId: number) {
        return listQueries.getListFilters(userId);
    }

    async function getTagNames(userId: number) {
        return await tagQueries.getTagNames(userId);
    }

    async function getMediaDetailsByIds(mediaIds: number[], userId?: number) {
        return repository.getMediaDetailsByIds(mediaIds, userId);
    }

    async function bulkInsertUserMedia(rows: TDef["repository"]["tables"]["listTable"]["$inferInsert"][]) {
        return repository.bulkInsertUserMedia(rows);
    }

    function findById(mediaId: number) {
        return repository.findById(mediaId);
    }

    async function findByApiIds(apiIds: (number | string)[]) {
        return repository.findByApiIds(apiIds);
    }

    async function findUserMediaIds(userId: number, mediaIds: number[]) {
        return repository.findUserMediaIds(userId, mediaIds);
    }

    async function findByNames(names: string[]) {
        return repository.findByNames(names);
    }

    async function downloadMediaListAsCSV(userId: number) {
        const mediaType = identity.mediaType;
        const rows = await repository.downloadMediaListAsCSV(userId);

        return rows?.map(({ addedAt: _addedAt, lastUpdated: _lastUpdated, ...row }) => ({
            ...row,
            mediaType,
            formatVersion: MYLISTS_CSV_VERSION,
            externalApiSource: ingestion.externalApiSource,
        }) satisfies MyListsCSVImport);
    }

    async function getSearchListFilters(userId: number, query: string, job: JobType) {
        return repository.getSearchListFilters(userId, query, job);
    }

    async function getMediaJobDetails(job: JobType, name: string, pagination: Pagination, userId?: number) {
        const page = pagination.page ?? 1;
        const perPage = pagination.perPage ?? 24;
        const offset = (page - 1) * perPage;

        return repository.getMediaJobDetails(job, name, offset, perPage, userId);
    }

    async function getMediaCommunityActivity(actor: Actor, mediaId: number, search: SearchType) {
        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        return communityQueries.getMediaCommunityActivity(actor, mediaId, search);
    }

    function editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
        return withTransaction(() => {
            return tagQueries.editUserTag(userId, tag, action, mediaId);
        });
    }

    async function getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs) {
        return listQueries.getMediaList(currentUserId, userId, args);
    }

    async function getTagsView(userId: number, search: SimpleSearch) {
        return tagQueries.getTagsView(userId, search);
    }

    function addMediaToUserList(userId: number, mediaId: number, status?: Status) {
        const newStatus = status ?? servicePolicy.defaultStatus;

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = repository.findUserMedia(userId, mediaId);
        if (oldState) throw new FormattedError("Media already in your list");

        const newState = repository.addMediaToUserList(userId, media, newStatus);
        const delta = calculateDeltaStats(null, newState, media);

        const logPayload = { oldValue: null, newValue: newState.status };

        return {
            media,
            delta,
            newState,
            logPayload,
        };
    }

    function updateUserMediaDetails(userId: number, mediaId: number, payload: UpdateUserMedia["payload"]): UpdateUserMediaDetails<any, any> {
        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = repository.findUserMedia(userId, mediaId);
        if (!oldState) throw new FormattedError("Media not in your list");

        const updateHandler = updateHandlers[payload.type];
        if (!updateHandler) throw new Error(`No handler found for command type: ${payload.type}`);
        const [completeNewData, logPayload] = updateHandler(oldState, payload, media);

        const newState = repository.updateUserMediaDetails(userId, mediaId, completeNewData);
        const delta = calculateDeltaStats(oldState, newState, media);

        return { media, delta, newState, logPayload };
    }

    async function updateUserCustomCover(userId: number, payload: UpdateUserCustomCover) {
        const media = repository.findById(payload.mediaId);
        if (!media) throw notFound();

        const userMedia = repository.findUserMedia(userId, payload.mediaId);
        if (!userMedia) throw new FormattedError("Media not in your list");

        let imageName: string | null = null;
        if (!payload.remove) {
            const dirSaveName = identity.coverDirectory;

            if (payload.imageFile) {
                imageName = await saveUploadedImage({ dirSaveName, file: payload.imageFile });
            }
            else if (payload.imageUrl) {
                imageName = await saveImageFromUrl({ dirSaveName, imageUrl: payload.imageUrl });
            }

            if (!imageName || imageName === "default.jpg") {
                throw new FormattedError("Could not update the custom cover. Please choose another one.");
            }
        }

        return repository.updateUserMediaDetails(userId, payload.mediaId, { customCover: imageName });
    }

    function removeMediaFromUserList(userId: number, mediaId: number) {
        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = repository.findUserMedia(userId, mediaId);
        if (!oldState) throw new FormattedError("Media not in your list");

        repository.removeMediaFromUserList(userId, mediaId);
        const delta = calculateDeltaStats(oldState, null, media);

        return delta;
    }

    async function getMediaAndUserDetails(userId: number | undefined, mediaId: number) {
        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const mediaWithDetails = await repository.findAllAssociatedDetails(media.id);
        if (!mediaWithDetails) throw notFound();

        const userMedia = repository.findUserMedia(userId, mediaWithDetails.id);
        const similarMedia = await repository.findSimilarMedia(mediaWithDetails.id);
        const followsData = await communityQueries.getUserFollowsMediaData(userId, mediaWithDetails.id);

        return {
            userMedia,
            followsData,
            similarMedia,
            media: mediaWithDetails,
        };
    }

    function calculateDeltaStats(
        oldState: UserMediaWithTags<TDef["repository"]["tables"]["listTable"]["$inferSelect"]> | null,
        newState: TDef["repository"]["tables"]["listTable"]["$inferSelect"] | null,
        media: TDef["repository"]["tables"]["mediaTable"]["$inferSelect"],
    ): DeltaStats {
        const { progressTotals } = servicePolicy;

        const oldTotals = progressTotals(oldState, media);
        const newTotals = progressTotals(newState, media);

        const delta: DeltaStats = {
            entriesRated: 0,
            sumEntriesRated: 0,
            entriesCommented: 0,
            entriesFavorites: 0,
            timeSpent: newTotals.timeSpent - oldTotals.timeSpent,
            totalRedo: newTotals.totalRedo - oldTotals.totalRedo,
            totalSpecific: newTotals.totalSpecific - oldTotals.totalSpecific,
        };

        if (!oldState && newState) delta.totalEntries = 1;
        else if (oldState && !newState) delta.totalEntries = -1;

        if (oldState?.status !== newState?.status) {
            const statusCounts: Partial<Record<Status, number>> = {};

            if (oldState) statusCounts[oldState.status as Status] = -1;
            if (newState) statusCounts[newState.status as Status] = (statusCounts[newState.status as Status] ?? 0) + 1;

            delta.statusCounts = statusCounts;
        }

        const oldRating = oldState?.rating;
        const newRating = newState?.rating;

        const isRated = newRating != null;
        const wasRated = oldRating != null;

        if (wasRated && !isRated) {
            delta.entriesRated = -1;
            delta.sumEntriesRated = -oldRating;
        }
        else if (!wasRated && isRated) {
            delta.entriesRated = 1;
            delta.sumEntriesRated = newRating;
        }
        else if (wasRated && isRated && oldRating !== newRating) {
            delta.sumEntriesRated = newRating - oldRating;
        }

        const wasCommented = !!oldState?.comment;
        const isCommented = !!newState?.comment;
        if (wasCommented !== isCommented) delta.entriesCommented = isCommented ? 1 : -1;

        const wasFavorited = !!oldState?.favorite;
        const isFavorited = !!newState?.favorite;
        if (wasFavorited !== isFavorited) delta.entriesFavorites = isFavorited ? 1 : -1;

        return delta;
    }

    return {
        findById,
        editUserTag,
        getTagsView,
        getTagNames,
        findByNames,
        getMediaList,
        searchByName,
        findByApiIds,
        getListFilters,
        findUserMediaIds,
        getUpcomingMedia,
        getUserFavorites,
        getMediaJobDetails,
        addMediaToUserList,
        getPopularMediaRefs,
        calculateDeltaStats,
        bulkInsertUserMedia,
        getMediaDetailsByIds,
        searchUserListByName,
        getSearchListFilters,
        updateUserCustomCover,
        downloadMediaListAsCSV,
        updateUserMediaDetails,
        getMediaAndUserDetails,
        removeMediaFromUserList,
        searchMediadleSuggestion,
        getMediaCommunityActivity,
    };
}


export function createSimpleUpdateHandler<K extends string>(propName: K): UpdateHandlerFn<any, any, any> {
    return (currentState, payload) => {
        const newState = { ...currentState, [propName]: payload[propName] };
        return [newState, null];
    };
}
