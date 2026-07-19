import {notFound} from "@tanstack/react-router";
import {DeltaStats} from "@/lib/types/stats.types";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Movie, MoviesList} from "@/lib/server/domain/media/movies/movies.types";
import {MovieSchemaConfig} from "@/lib/server/domain/media/movies/movies.config";
import {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {RedoPayload, StatusPayload, UserMediaWithTags} from "@/lib/types/user-media.types";


export class MoviesService extends BaseService<MovieSchemaConfig, MoviesRepository> {
    constructor(repository: MoviesRepository) {
        super(repository);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
        }
    }

    async lockOldMovies() {
        return this.repository.lockOldMovies();
    }

    async findByTitleAndYear(title: string, year: number) {
        return this.repository.findByTitleAndYear(title, year);
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.avgMovieDuration(userId);
        const durationDistrib = await this.repository.movieDurationDistrib(userId);
        const { totalBudget, totalRevenue } = await this.repository.budgetRevenueStats(userId);
        const { directorsStats, actorsStats, langsStats } = await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            totalBudget,
            totalRevenue,
            avgDuration,
            durationDistrib,
            directorsStats,
            actorsStats,
            langsStats,
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

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const editableFields = this.repository.config.editableFields;
        const fields = {} as Record<Partial<keyof Movie>, any>;
        fields.apiId = media.apiId;

        if (payload?.imageCover) {
            const imageName = await saveImageFromUrl({
                imageUrl: payload.imageCover,
                dirSaveName: "movies-covers",
            });
            fields.imageCover = imageName;
            delete payload.imageCover;
        }

        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as keyof Movie)) {
                fields[key as keyof typeof media] = payload[key as keyof typeof media];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fields });
    }

    calculateDeltaStats(oldState: UserMediaWithTags<MoviesList> | null, newState: MoviesList | null, media: Movie) {
        const delta: DeltaStats = {};
        const statusCounts: Partial<Record<Status, number>> = {};

        // Extract Old State Info
        const oldStatus = oldState?.status;
        const oldRating = oldState?.rating;
        const oldRedo = oldState?.redo ?? 0;
        const wasCommented = !!oldState?.comment;
        const wasRated = oldState?.rating != null;
        const wasFavorited = !!oldState?.favorite;
        const oldTotalSpecificValue = oldState?.total ?? 0;
        const oldTotalTimeSpent = oldTotalSpecificValue * media.duration;

        // Extract New State Info
        const newStatus = newState?.status;
        const newRating = newState?.rating;
        const newRedo = newState?.redo ?? 0;
        const isCommented = !!newState?.comment;
        const isRated = newState?.rating != null;
        const isFavorited = !!newState?.favorite;
        const newTotalSpecificValue = newState?.total ?? 0;
        const newTotalTimeSpent = newTotalSpecificValue * media.duration;

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

    updateStatusHandler(currentState: MoviesList, payload: StatusPayload, _media: Movie): [MoviesList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        newState.redo = 0;
        if (payload.status === Status.COMPLETED) {
            newState.total = 1;
        }
        else {
            newState.total = 0;
        }

        return [newState, logPayload];
    };

    updateRedoHandler(currentState: MoviesList, payload: RedoPayload, _media: Movie): [MoviesList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = payload.redo + 1;

        return [newState, logPayload];
    };
}
