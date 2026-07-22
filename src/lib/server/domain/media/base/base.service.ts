import {notFound} from "@tanstack/react-router";
import {DeltaStats} from "@/lib/types/stats.types";
import {Tag} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {MyListsCSVImport} from "@/lib/types/imports.types";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {AnyMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {JobType, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {MYLISTS_CSV_VERSION} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {UpdateHandlerFn, UpdateUserMediaDetails, UserMediaWithTags} from "@/lib/types/user-media.types";
import {MediaListArgs, Pagination, SearchType, SimpleSearch, UpdateUserCustomCover, UpdateUserMedia} from "@/lib/schemas";


export abstract class BaseService<TDef extends AnyMediaDefinition, R extends BaseRepository<TDef>> {
    protected repository: R;
    protected readonly identity: TDef["identity"];
    protected readonly ingestion: TDef["ingestion"];
    protected readonly servicePolicy: TDef["service"];
    protected updateHandlers: Partial<Record<
        UpdateType,
        UpdateHandlerFn<TDef["repository"]["tables"]["listTable"]["$inferSelect"], any, TDef["repository"]["tables"]["mediaTable"]["$inferSelect"]>
    >>;

    protected constructor(repository: R, definition: TDef) {
        this.repository = repository;
        this.identity = definition.identity;
        this.ingestion = definition.ingestion;
        this.servicePolicy = definition.service;

        // User progress handlers based on update type
        this.updateHandlers = {
            [UpdateType.RATING]: this.createSimpleUpdateHandler("rating"),
            [UpdateType.COMMENT]: this.createSimpleUpdateHandler("comment"),
            [UpdateType.FAVORITE]: this.createSimpleUpdateHandler("favorite"),
        }
    }

    async getCoverFilenames() {
        const coverFilenames = await this.repository.getCoverFilenames();
        return coverFilenames.map(({ imageCover }) => imageCover.split("/").pop() as string);
    }

    async getPopularMediaRefs() {
        return this.repository.getPopularMediaRefs();
    }

    async getCustomCoverFilenames() {
        const coverFilenames = await this.repository.getCustomCoverFilenames();
        return coverFilenames
            .map(({ customCover }) => customCover?.split("/").pop() as string | undefined)
            .filter((cover): cover is string => !!cover);
    }

    async getUserFavorites(userId: number, limit = 7) {
        return this.repository.getUserFavorites(userId, limit);
    }

    async searchUserListByName(userId: number, query: string, limit?: number) {
        return this.repository.searchUserListByName(userId, query, limit);
    }

    async hasUserMedia(userId: number, mediaId: number) {
        return !!await this.repository.findUserMedia(userId, mediaId);
    }

    async getOrphanedMediaIds(mediaType: MediaType) {
        return this.repository.getOrphanedMediaIds(mediaType);
    }

    async getUpcomingMedia(userId?: number, maxAWeek?: boolean) {
        return this.repository.getUpcomingMedia(userId, maxAWeek);
    }

    async searchMediadleSuggestion(query: string) {
        return this.repository.searchMediadleSuggestion(query);
    }

    async searchByName(query: string, limit?: number) {
        return this.repository.searchByName(query, limit);
    }

    async removeMediaByIds(mediaIds: number[]) {
        return this.repository.removeMediaByIds(mediaIds);
    }

    async getListFilters(userId: number) {
        return this.repository.getListFilters(userId);
    }

    async getTagNames(userId: number) {
        return await this.repository.getTagNames(userId);
    }

    async getMediaDetailsByIds(mediaIds: number[], userId?: number) {
        return this.repository.getMediaDetailsByIds(mediaIds, userId);
    }

    async getMediaDurationsByIds(mediaIds: number[]) {
        return this.repository.getMediaDurationsByIds(mediaIds);
    }

    async bulkInsertUserMedia(rows: TDef["repository"]["tables"]["listTable"]["$inferInsert"][]) {
        return this.repository.bulkInsertUserMedia(rows);
    }

    async findById(mediaId: number) {
        return this.repository.findById(mediaId);
    }

    async findByApiId(apiId: number | string) {
        return this.repository.findByApiId(apiId);
    }

    async findByApiIds(apiIds: (number | string)[]) {
        return this.repository.findByApiIds(apiIds);
    }

    async findByNames(names: string[]) {
        return this.repository.findByNames(names);
    }

    async downloadMediaListAsCSV(userId: number) {
        const mediaType = this.identity.mediaType;
        const rows = await this.repository.downloadMediaListAsCSV(userId);

        return rows?.map(({ addedAt: _addedAt, lastUpdated: _lastUpdated, ...row }) => ({
            ...row,
            mediaType,
            formatVersion: MYLISTS_CSV_VERSION,
            externalApiSource: this.ingestion.externalApiSource,
        }) satisfies MyListsCSVImport);
    }

    async getSearchListFilters(userId: number, query: string, job: JobType) {
        return this.repository.getSearchListFilters(userId, query, job);
    }

    async getMediaJobDetails(job: JobType, name: string, pagination: Pagination, userId?: number) {
        const page = pagination.page ?? 1;
        const perPage = pagination.perPage ?? 24;
        const offset = (page - 1) * perPage;

        return this.repository.getMediaJobDetails(job, name, offset, perPage, userId);
    }

    async getMediaCommunityActivity(userId: number | undefined, mediaId: number, search: SearchType) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        return this.repository.getMediaCommunityActivity(userId, mediaId, search);
    }

    async editUserTag(userId: number, tag: Tag, action: TagAction, mediaId?: number) {
        return this.repository.editUserTag(userId, tag, action, mediaId);
    }

    async getMediaList(currentUserId: number | undefined, userId: number, args: MediaListArgs) {
        return this.repository.getMediaList(currentUserId, userId, args);
    }

    async getTagsView(userId: number, search: SimpleSearch) {
        return this.repository.getTagsView(userId, search);
    }

    async addMediaToUserList(userId: number, mediaId: number, status?: Status) {
        const newStatus = status ?? this.servicePolicy.defaultStatus;

        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = await this.repository.findUserMedia(userId, mediaId);
        if (oldState) throw new FormattedError("Media already in your list");

        const newState = await this.repository.addMediaToUserList(userId, media, newStatus);
        const delta = this.calculateDeltaStats(null, newState, media);

        const logPayload = { oldValue: null, newValue: newState.status };

        return {
            media,
            delta,
            newState,
            logPayload,
        };
    }

    async updateUserMediaDetails(userId: number, mediaId: number, payload: UpdateUserMedia["payload"]): Promise<UpdateUserMediaDetails<any, any>> {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = await this.repository.findUserMedia(userId, mediaId);
        if (!oldState) throw new FormattedError("Media not in your list");

        const updateHandler = this.updateHandlers[payload.type];
        if (!updateHandler) throw new Error(`No handler found for command type: ${payload.type}`);
        const [completeNewData, logPayload] = await updateHandler(oldState, payload, media);

        const newState = await this.repository.updateUserMediaDetails(userId, mediaId, completeNewData);
        const delta = this.calculateDeltaStats(oldState, newState, media);

        return { media, delta, newState, logPayload };
    }

    async updateUserCustomCover(userId: number, payload: UpdateUserCustomCover) {
        const media = await this.repository.findById(payload.mediaId);
        if (!media) throw notFound();

        const userMedia = await this.repository.findUserMedia(userId, payload.mediaId);
        if (!userMedia) throw new FormattedError("Media not in your list");

        let imageName: string | null = null;
        if (!payload.remove) {
            const dirSaveName = this.identity.coverDirectory;

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

        return this.repository.updateUserMediaDetails(userId, payload.mediaId, { customCover: imageName });
    }

    async removeMediaFromUserList(userId: number, mediaId: number) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const oldState = await this.repository.findUserMedia(userId, mediaId);
        if (!oldState) throw new FormattedError("Media not in your list");

        await this.repository.removeMediaFromUserList(userId, mediaId);
        const delta = this.calculateDeltaStats(oldState, null, media);

        return delta;
    }

    async getMediaAndUserDetails(userId: number | undefined, mediaId: number) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const mediaWithDetails = await this.repository.findAllAssociatedDetails(media.id);
        if (!mediaWithDetails) throw notFound();

        const similarMedia = await this.repository.findSimilarMedia(mediaWithDetails.id);
        const userMedia = await this.repository.findUserMedia(userId, mediaWithDetails.id);
        const followsData = await this.repository.getUserFollowsMediaData(userId, mediaWithDetails.id);

        return {
            userMedia,
            followsData,
            similarMedia,
            media: mediaWithDetails,
        };
    }

    createSimpleUpdateHandler<K extends string>(propName: K): UpdateHandlerFn<any, any, any> {
        return (currentState, payload) => {
            const newState = { ...currentState, [propName]: payload[propName] };
            return [newState, null];
        };
    }

    calculateDeltaStats(
        oldState: UserMediaWithTags<TDef["repository"]["tables"]["listTable"]["$inferSelect"]> | null,
        newState: TDef["repository"]["tables"]["listTable"]["$inferSelect"] | null,
        media: TDef["repository"]["tables"]["mediaTable"]["$inferSelect"],
    ): DeltaStats {
        const { progressTotals } = this.servicePolicy;

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

    // --- Admin Methods ---------------------------------------------------

    async getUserMediaAddedAndUpdatedForAdmin() {
        return this.repository.getUserMediaAddedAndUpdatedForAdmin();
    }

    // --- Abstract Methods ------------------------------------------------

    abstract getMediaEditableFields(mediaId: number): Promise<{ fields: Record<string, any> }>

    abstract updateMediaEditableFields(mediaId: number, payload: Record<string, any>): Promise<void>;
}
