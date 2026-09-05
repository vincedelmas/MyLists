import {notFound} from "@tanstack/react-router";
import {Actor} from "@/lib/server/authorization";
import {DeltaStats} from "@/lib/types/stats.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {MyListsCSVImport} from "@/lib/types/imports.types";
import {AddedMediaDetails, Tag} from "@/lib/types/media-common.types";
import {JobType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {createSimpleUpdateHandler} from "@/lib/utils/media-update-handlers";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import type {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {MYLISTS_CSV_VERSION} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {UpdateHandlerFn, UpdateUserMediaDetails, UserMediaWithTags} from "@/lib/types/user-media.types";
import {MediaListArgs, Pagination, SearchType, SimpleSearch, UpdateUserCustomCover, UpdateUserMedia} from "@/lib/schemas";


type MediaServiceRepository<TDef extends AnyServerMediaDefinition> = BaseRepository<TDef> & {
    addMediaToUserList(userId: number, media: TDef["repository"]["tables"]["mediaTable"]["$inferSelect"], status: Status): Promise<TDef["repository"]["tables"]["listTable"]["$inferSelect"]>;
    findAllAssociatedDetails(mediaId: number): Promise<(TDef["repository"]["tables"]["mediaTable"]["$inferSelect"] & AddedMediaDetails) | undefined>;
};


type MediaUpdateHandlers<TDef extends AnyServerMediaDefinition> = Partial<Record<
    UpdateType,
    UpdateHandlerFn<TDef["repository"]["tables"]["listTable"]["$inferSelect"], any, TDef["repository"]["tables"]["mediaTable"]["$inferSelect"]>
>>;


export const createBaseService = <TDef extends AnyServerMediaDefinition, R extends MediaServiceRepository<TDef>>(
    repository: R,
    definition: TDef,
    mediaUpdateHandlers: MediaUpdateHandlers<TDef>,
) => {
    const { identity, ingestion, service: servicePolicy } = definition;

    const updateHandlers: MediaUpdateHandlers<TDef> = {
        [UpdateType.RATING]: createSimpleUpdateHandler("rating"),
        [UpdateType.COMMENT]: createSimpleUpdateHandler("comment"),
        [UpdateType.FAVORITE]: createSimpleUpdateHandler("favorite"),
        ...mediaUpdateHandlers,
    };

    const service = {
        async getCoverFilenames() {
            const coverFilenames = await repository.getCoverFilenames();
            return coverFilenames.map(({ imageCover }) => imageCover.split("/").pop() as string);
        },

        async getPopularMediaRefs() {
            return repository.getPopularMediaRefs();
        },

        async getCustomCoverFilenames() {
            const coverFilenames = await repository.getCustomCoverFilenames();
            return coverFilenames
                .map(({ customCover }) => customCover?.split("/").pop() as string | undefined)
                .filter((cover): cover is string => !!cover);
        },

        async getUserFavorites(userId: number, limit = 7) {
            return repository.getUserFavorites(userId, limit);
        },

        async searchUserListByName(userId: number, query: string, limit?: number) {
            return repository.searchUserListByName(userId, query, limit);
        },

        async getOrphanedMediaIds() {
            return repository.getOrphanedMediaIds();
        },

        async getUpcomingMedia(userId?: number, maxAWeek?: boolean) {
            return repository.getUpcomingMedia(userId, maxAWeek);
        },

        async searchMediadleSuggestion(query: string) {
            return repository.searchMediadleSuggestion(query);
        },

        async searchByName(query: string, limit?: number) {
            return repository.searchByName(query, limit);
        },

        async removeMediaByIds(mediaIds: number[]) {
            return repository.removeMediaByIds(mediaIds);
        },

        async getListFilters(userId: number) {
            return repository.getListFilters(userId);
        },

        async getTagNames(userId: number) {
            return await repository.getTagNames(userId);
        },

        async getMediaDetailsByIds(mediaIds: number[], userId?: number) {
            return repository.getMediaDetailsByIds(mediaIds, userId);
        },

        async bulkInsertUserMedia(rows: TDef["repository"]["tables"]["listTable"]["$inferInsert"][]) {
            return repository.bulkInsertUserMedia(rows);
        },

        async findById(mediaId: number) {
            return repository.findById(mediaId);
        },

        async findByApiIds(apiIds: (number | string)[]) {
            return repository.findByApiIds(apiIds);
        },

        async findUserMediaIds(userId: number, mediaIds: number[]) {
            return repository.findUserMediaIds(userId, mediaIds);
        },

        async findByNames(names: string[]) {
            return repository.findByNames(names);
        },

        async downloadMediaListAsCSV(userId: number) {
            const mediaType = identity.mediaType;
            const rows = await repository.downloadMediaListAsCSV(userId);

            return rows?.map(({ addedAt: _addedAt, lastUpdated: _lastUpdated, ...row }) => ({
                ...row,
                mediaType,
                formatVersion: MYLISTS_CSV_VERSION,
                externalApiSource: ingestion.externalApiSource,
            }) satisfies MyListsCSVImport);
        },

        async getSearchListFilters(userId: number, query: string, job: JobType) {
            return repository.getSearchListFilters(userId, query, job);
        },

        async getMediaJobDetails(job: JobType, name: string, pagination: Pagination, userId?: number) {
            const page = pagination.page ?? 1;
            const perPage = pagination.perPage ?? 24;
            const offset = (page - 1) * perPage;

            return repository.getMediaJobDetails(job, name, offset, perPage, userId);
        },

        async getMediaCommunityActivity(actor: Actor, mediaId: number, search: SearchType) {
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            return repository.getMediaCommunityActivity(actor, mediaId, search);
        },

        async editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
            return repository.editUserTag(userId, tag, action, mediaId);
        },

        async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs) {
            return repository.getMediaList(currentUserId, userId, args);
        },

        async getTagsView(userId: number, search: SimpleSearch) {
            return repository.getTagsView(userId, search);
        },

        async addMediaToUserList(userId: number, mediaId: number, status?: Status) {
            const newStatus = status ?? servicePolicy.defaultStatus;

            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            const oldState = await repository.findUserMedia(userId, mediaId);
            if (oldState) throw new FormattedError("Media already in your list");

            const newState = await repository.addMediaToUserList(userId, media, newStatus);
            const delta = service.calculateDeltaStats(null, newState, media);

            const logPayload = { oldValue: null, newValue: newState.status };

            return {
                media,
                delta,
                newState,
                logPayload,
            };
        },

        async updateUserMediaDetails(userId: number, mediaId: number, payload: UpdateUserMedia["payload"]): Promise<UpdateUserMediaDetails<any, any>> {
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            const oldState = await repository.findUserMedia(userId, mediaId);
            if (!oldState) throw new FormattedError("Media not in your list");

            const updateHandler = updateHandlers[payload.type];
            if (!updateHandler) throw new Error(`No handler found for command type: ${payload.type}`);
            const [completeNewData, logPayload] = await updateHandler(oldState, payload, media);

            const newState = await repository.updateUserMediaDetails(userId, mediaId, completeNewData);
            const delta = service.calculateDeltaStats(oldState, newState, media);

            return { media, delta, newState, logPayload };
        },

        async updateUserCustomCover(userId: number, payload: UpdateUserCustomCover) {
            const media = await repository.findById(payload.mediaId);
            if (!media) throw notFound();

            const userMedia = await repository.findUserMedia(userId, payload.mediaId);
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
        },

        async removeMediaFromUserList(userId: number, mediaId: number) {
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            const oldState = await repository.findUserMedia(userId, mediaId);
            if (!oldState) throw new FormattedError("Media not in your list");

            await repository.removeMediaFromUserList(userId, mediaId);
            const delta = service.calculateDeltaStats(oldState, null, media);

            return delta;
        },

        async getMediaAndUserDetails(userId: number | undefined, mediaId: number) {
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            const mediaWithDetails = await repository.findAllAssociatedDetails(media.id);
            if (!mediaWithDetails) throw notFound();

            const similarMedia = await repository.findSimilarMedia(mediaWithDetails.id);
            const userMedia = await repository.findUserMedia(userId, mediaWithDetails.id);
            const followsData = await repository.getUserFollowsMediaData(userId, mediaWithDetails.id);

            return {
                userMedia,
                followsData,
                similarMedia,
                media: mediaWithDetails,
            };
        },

        calculateDeltaStats(
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
        },

        // --- Admin Methods ---------------------------------------------------

        async getUserMediaAddedAndUpdatedForAdmin() {
            return repository.getUserMediaAddedAndUpdatedForAdmin();
        },
    };

    return service;
};


export type BaseService<TDef extends AnyServerMediaDefinition = AnyServerMediaDefinition, R extends MediaServiceRepository<TDef> = MediaServiceRepository<TDef>> = ReturnType<typeof createBaseService<TDef, R>>;
