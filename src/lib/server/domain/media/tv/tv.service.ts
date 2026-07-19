import {getTableName} from "drizzle-orm";
import {notFound} from "@tanstack/react-router";
import {DeltaStats} from "@/lib/types/stats.types";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {TvList, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {TvAchievements} from "@/lib/server/domain/media/tv/tv.achievements";
import {AnimeSchemaConfig} from "@/lib/server/domain/media/tv/anime/anime.config";
import {SeriesSchemaConfig} from "@/lib/server/domain/media/tv/series/series.config";
import {EpsSeasonPayload, RedoTvPayload, StatusPayload, UserMediaWithTags} from "@/lib/types/user-media.types";


export class TvService extends BaseService<AnimeSchemaConfig | SeriesSchemaConfig, TvRepository> {
    constructor(repository: TvRepository) {
        super(repository, new TvAchievements(repository.config));

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
            [UpdateType.TV]: this.updateEpsSeasonsHandler.bind(this),
        }
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide
        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.avgTvDuration(userId);
        const totalSeasons = await this.repository.computeTotalSeasons(userId);
        const durationDistrib = await this.repository.tvDurationDistrib(userId);
        const { networksStats, actorsStats, countriesStats } = await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            totalSeasons,
            avgDuration,
            durationDistrib,
            networksStats,
            actorsStats,
            countriesStats,
        };
    }

    async getMediaEditableFields(mediaId: number) {
        const media = await this.repository.findById(mediaId);
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

    async getMediaEpsPerSeason(mediaId: number) {
        return this.repository.getMediaEpsPerSeason(mediaId);
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const editableFields = this.repository.config.editableFields;
        type FieldsType = typeof editableFields[number];
        const fields: Partial<Record<FieldsType, any>> & { apiId: typeof media.apiId; } = { apiId: media.apiId };

        if (payload?.imageCover) {
            const tableName = getTableName(this.repository.config.mediaTable);
            const imageName = await saveImageFromUrl({
                imageUrl: payload.imageCover,
                dirSaveName: (tableName === "series") ? "series-covers" : "anime-covers",
            });
            fields.imageCover = imageName;
            delete payload.imageCover;
        }

        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as FieldsType)) {
                fields[key as FieldsType] = payload[key];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fields as any });
    }

    calculateDeltaStats(oldState: UserMediaWithTags<TvList> | null, newState: TvList | null, media: TvType) {
        const delta: DeltaStats = {};
        const statusCounts: Partial<Record<Status, number>> = {};

        // Extract Old State Info
        const oldRedo = oldState?.redo2;
        const oldStatus = oldState?.status;
        const oldRating = oldState?.rating;
        const wasCommented = !!oldState?.comment;
        const wasRated = oldState?.rating != null;
        const wasFavorited = !!oldState?.favorite;
        const oldTotalSpecificValue = oldState?.total ?? 0;
        const oldTotalTimeSpent = oldTotalSpecificValue * media.duration;
        const oldSumRedo = oldRedo ? oldRedo.reduce((a, c) => a + c, 0) : 0;

        // Extract New State Info
        const newStatus = newState?.status;
        const newRating = newState?.rating;
        const isCommented = !!newState?.comment;
        const isRated = newState?.rating != null;
        const isFavorited = !!newState?.favorite;
        const newTotalSpecificValue = newState?.total ?? 0;
        const newTotalTimeSpent = newTotalSpecificValue * media.duration;
        const newSumRedo = newState?.redo2.reduce((a, c) => a + c, 0) ?? 0;

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
        delta.totalRedo = (newSumRedo - oldSumRedo);

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

    async updateRedoHandler(currentState: TvList, payload: RedoTvPayload, media: TvType): Promise<[TvList, LogPayload]> {
        const epsPerSeason = await this.repository.getMediaEpsPerSeason(media.id);

        // Safety check - Should not happen
        if (currentState.redo2?.length !== epsPerSeason.length || payload.redo2?.length !== epsPerSeason.length) {
            throw new FormattedError("Sorry, an error occurred. This will be fixed shortly.");
        }

        const newState = { ...currentState, redo2: payload.redo2 };

        const logPayload = {
            oldValue: currentState.redo2.reduce((a, b) => a + b, 0),
            newValue: payload.redo2.reduce((a, b) => a + b, 0),
        };

        const redoDiff = newState.redo2.map((val, i) => val - currentState.redo2[i]);
        const valuesToApply = redoDiff.reduce((sum, diff, i) => sum + diff * epsPerSeason[i].episodes, 0);
        newState.total = (currentState?.total ?? 0) + (valuesToApply ?? 0);

        return [newState, logPayload];
    }

    async updateStatusHandler(currentState: TvList, payload: StatusPayload, media: TvType): Promise<[TvList, LogPayload]> {
        const newState = { ...currentState, status: payload.status };
        const specialStatuses: Status[] = [Status.RANDOM, Status.PLAN_TO_WATCH];
        const epsPerSeason = await this.repository.getMediaEpsPerSeason(media.id);
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (specialStatuses.includes(currentState.status) && !specialStatuses.includes(newState.status)) {
            newState.currentEpisode = 1;
        }

        if (payload.status === Status.COMPLETED) {
            const sumEpisodesTv = epsPerSeason.reduce((a, b) => a + b.episodes, 0);
            const sumOldRedoEps = currentState.redo2.reduce((a, b, i) => a + b * (epsPerSeason[i]?.episodes ?? 0), 0);

            newState.total = sumEpisodesTv + sumOldRedoEps;
            newState.currentSeason = epsPerSeason.at(-1)!.season;
            newState.currentEpisode = epsPerSeason.at(-1)!.episodes;
        }
        else if (specialStatuses.includes(payload.status)) {
            newState.total = 0;
            newState.currentSeason = 1;
            newState.currentEpisode = 0;
            newState.redo2 = Array(epsPerSeason.length).fill(0);
        }

        return [newState, logPayload];
    }

    async updateEpsSeasonsHandler(currentState: TvList, payload: EpsSeasonPayload, media: TvType): Promise<[TvList, LogPayload]> {
        const epsPerSeason = await this.repository.getMediaEpsPerSeason(media.id);
        const epsPerSeasList = epsPerSeason.map((eps) => eps.episodes);

        if (payload.currentSeason) {
            if (payload.currentSeason > epsPerSeason.length) {
                throw new FormattedError("Invalid season number");
            }

            const newState = { ...currentState, currentSeason: payload.currentSeason };
            const logPayload = {
                oldValue: [currentState.currentSeason, currentState.currentEpisode],
                newValue: [payload.currentSeason, 1],
            }

            const newWatched = epsPerSeasList.slice(0, payload.currentSeason - 1).reduce((a, b) => a + b, 0) + 1;
            const newTotal = newWatched + currentState.redo2.reduce((a, b, i) => a + b * (epsPerSeasList[i] ?? 0), 0);

            newState.total = newTotal
            newState.currentEpisode = 1;

            return [newState, logPayload] as [TvList, LogPayload];
        }

        if (payload.currentEpisode) {
            if (payload.currentEpisode > epsPerSeason[currentState.currentSeason - 1].episodes) {
                throw new FormattedError("Invalid episode");
            }

            const newState = { ...currentState, currentEpisode: payload.currentEpisode };
            const logPayload = {
                oldValue: [currentState.currentSeason, currentState.currentEpisode],
                newValue: [currentState.currentSeason, payload.currentEpisode],
            }

            const newWatched = epsPerSeasList
                .slice(0, currentState.currentSeason - 1)
                .reduce((a, b) => a + b, 0) + payload.currentEpisode;

            newState.total = newWatched + currentState.redo2.reduce((a, b, i) => a + b * (epsPerSeasList[i] ?? 0), 0);

            return [newState, logPayload] as [TvList, LogPayload];
        }

        return [currentState, null];
    }
}
