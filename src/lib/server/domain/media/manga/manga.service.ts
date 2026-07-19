import {notFound} from "@tanstack/react-router";
import {DeltaStats} from "@/lib/types/stats.types";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Manga, MangaList} from "@/lib/server/domain/media/manga/manga.types";
import {MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {ChapterPayload, RedoPayload, StatusPayload, UserMediaWithTags} from "@/lib/types/user-media.types";


export class MangaService extends BaseService<MangaSchemaConfig, MangaRepository> {
    constructor(repository: MangaRepository) {
        super(repository);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
            [UpdateType.CHAPTER]: this.updateChapterHandler.bind(this),
        }
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.avgMangaDuration(userId);
        const durationDistrib = await this.repository.mangaDurationDistrib(userId);
        const { publishersStats, authorsStats } = await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
        };
    }

    async getMediaEditableFields(mediaId: number) {
        const media = await this.repository.findAllAssociatedDetails(mediaId);
        if (!media) throw notFound();

        const editableFields = this.repository.config.editableFields;
        const fields: Record<string, any> = {};

        editableFields.forEach((field) => {
            if (field in media) {
                fields[field] = media[field as keyof typeof media];
            }
        });

        return { fields };
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const { genres, ...mediaData } = payload;

        if (genres && !Array.isArray(genres)) {
            throw new Error("Genres must be an array");
        }

        const editableFields = this.repository.config.editableFields;
        const fieldsToUpdate = {} as Record<Partial<keyof Manga>, any>;
        fieldsToUpdate.apiId = media.apiId;

        if (mediaData?.imageCover) {
            const imageName = await saveImageFromUrl({
                imageUrl: mediaData.imageCover,
                dirSaveName: "manga-covers",
            });
            fieldsToUpdate.imageCover = imageName;
            delete mediaData.imageCover;
        }

        for (const key in mediaData) {
            if (Object.prototype.hasOwnProperty.call(mediaData, key) && editableFields.includes(key as keyof Manga)) {
                fieldsToUpdate[key as keyof typeof media] = mediaData[key as keyof typeof media];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fieldsToUpdate, genresData: genres });
    }

    calculateDeltaStats(oldState: UserMediaWithTags<MangaList> | null, newState: MangaList | null, _media: Manga) {
        const delta: DeltaStats = {};
        const statusCounts: Partial<Record<Status, number>> = {};

        // TODO: Check how to avoid magic number 7

        // Extract Old State Info
        const oldStatus = oldState?.status;
        const oldRating = oldState?.rating;
        const oldRedo = oldState?.redo ?? 0;
        const wasCommented = !!oldState?.comment;
        const wasRated = oldState?.rating != null;
        const wasFavorited = !!oldState?.favorite;
        const oldTotalSpecificValue = oldState?.total ?? 0;
        const oldTotalTimeSpent = oldTotalSpecificValue * 7;

        // Extract New State Info
        const newStatus = newState?.status;
        const newRating = newState?.rating;
        const newRedo = newState?.redo ?? 0;
        const isCommented = !!newState?.comment;
        const isRated = newState?.rating != null;
        const isFavorited = !!newState?.favorite;
        const newTotalSpecificValue = newState?.total ?? 0;
        const newTotalTimeSpent = newTotalSpecificValue * 7;

        // --- Calculate Deltas ----------------------------------------------------------------

        // Total Entries
        if (!oldState && newState) {
            delta.totalEntries = 1;
        }
        else if (oldState && !newState) {
            delta.totalEntries = -1;
        }

        // Status Counts
        if (oldStatus !== newStatus) {
            if (oldStatus) {
                statusCounts[oldStatus] = (statusCounts[oldStatus] ?? 0) - 1;
            }
            if (newStatus) {
                statusCounts[newStatus] = (statusCounts[newStatus] ?? 0) + 1;
            }
        }

        // Time Spent
        delta.timeSpent = (newTotalTimeSpent - oldTotalTimeSpent);

        // Total Redo Count
        delta.totalRedo = (newRedo - oldRedo);

        // Total Specific
        delta.totalSpecific = (newTotalSpecificValue - oldTotalSpecificValue);

        // Rating Stats
        let entriesRatedDelta = 0;
        let sumEntriesRatedDelta = 0;
        if (wasRated && !isRated) {
            entriesRatedDelta = -1;
            sumEntriesRatedDelta = -(oldRating ?? 0);
        }
        else if (!wasRated && isRated) {
            entriesRatedDelta = 1;
            sumEntriesRatedDelta = newRating ?? 0;
        }
        else if (wasRated && isRated && oldRating !== newRating) {
            sumEntriesRatedDelta = (newRating ?? 0) - (oldRating ?? 0);
        }
        delta.entriesRated = entriesRatedDelta;
        delta.sumEntriesRated = sumEntriesRatedDelta;

        // Comment Stats
        let entriesCommentedDelta = 0;
        if (wasCommented && !isCommented) {
            entriesCommentedDelta = -1;
        }
        else if (!wasCommented && isCommented) {
            entriesCommentedDelta = 1;
        }
        delta.entriesCommented = entriesCommentedDelta;

        // Favorite Stats
        let entriesFavoritesDelta = 0;
        if (wasFavorited && !isFavorited) {
            entriesFavoritesDelta = -1;
        }
        else if (!wasFavorited && isFavorited) {
            entriesFavoritesDelta = 1;
        }
        delta.entriesFavorites = entriesFavoritesDelta;

        // Add statusCounts to delta only if entries
        if (Object.keys(statusCounts).length > 0) {
            delta.statusCounts = statusCounts;
        }

        return delta;
    }

    updateRedoHandler(currentState: MangaList, payload: RedoPayload, media: Manga): [MangaList, LogPayload] {
        if (!media.chapters) {
            throw new FormattedError("Cannot redo a manga without chapters");
        }

        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = media.chapters + (payload.redo * media.chapters);

        return [newState, logPayload];
    }

    updateStatusHandler(currentState: MangaList, payload: StatusPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.COMPLETED) {
            if (!media.chapters) {
                throw new FormattedError("Cannot complete a manga without chapters");
            }

            newState.total = media.chapters;
            newState.currentChapter = media.chapters;
        }
        else if (payload.status === Status.PLAN_TO_READ) {
            newState.redo = 0;
            newState.total = 0;
            newState.currentChapter = 0;
        }

        return [newState, logPayload];
    }

    updateChapterHandler(currentState: MangaList, payload: ChapterPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, currentChapter: payload.currentChapter };
        const logPayload = { oldValue: currentState.currentChapter, newValue: payload.currentChapter };

        newState.total = payload.currentChapter + (currentState.redo * (media.chapters ?? 0));

        return [newState, logPayload];
    }
}
