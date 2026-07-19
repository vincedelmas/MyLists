import {notFound} from "@tanstack/react-router";
import {DeltaStats} from "@/lib/types/stats.types";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Game, GamesList} from "@/lib/server/domain/media/games/games.types";
import {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {PlaytimePayload, StatusPayload, UserMediaWithTags} from "@/lib/types/user-media.types";


export class GamesService extends BaseService<GamesSchemaConfig, GamesRepository> {
    constructor(repository: GamesRepository) {
        super(repository);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
            [UpdateType.PLAYTIME]: this.updatePlaytimeHandler.bind(this),
            [UpdateType.PLATFORM]: this.createSimpleUpdateHandler("platform"),
        };
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.gameAvgPlaytime(userId);
        const durationDistrib = await this.repository.gamePlaytimeDistrib(userId);

        const { developersStats, publishersStats, platformsStats, enginesStats, perspectivesStats } =
            await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
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

    async getCompatiblePlatforms(mediaId: number) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        return this.repository.getCompatiblePlatforms(mediaId);
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const editableFields = this.repository.config.editableFields;
        const fields = {} as Record<Partial<keyof Game>, any>;
        fields.apiId = media.apiId;

        if (payload?.imageCover) {
            const imageName = await saveImageFromUrl({
                imageUrl: payload.imageCover,
                dirSaveName: "games-covers",
            });
            fields.imageCover = imageName;
            delete payload.imageCover;
        }

        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as keyof Game)) {
                fields[key as keyof typeof media] = payload[key as keyof typeof media];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fields });
    }

    calculateDeltaStats(oldState: UserMediaWithTags<GamesList> | null, newState: GamesList | null, _media: Game) {
        const delta: DeltaStats = {};
        const statusCounts: Partial<Record<Status, number>> = {};

        // Extract Old State Info
        const oldStatus = oldState?.status;
        const oldRating = oldState?.rating;
        const wasCommented = !!oldState?.comment;
        const wasRated = oldState?.rating != null;
        const wasFavorited = !!oldState?.favorite;
        const oldTotalTimeSpent = oldState?.playtime ?? 0;

        // Extract New State Info
        const newStatus = newState?.status;
        const newRating = newState?.rating;
        const isCommented = !!newState?.comment;
        const isRated = newState?.rating != null;
        const isFavorited = !!newState?.favorite;
        const newTotalTimeSpent = newState?.playtime ?? 0;

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

        // Total Redo Count - Always 0 for Games
        delta.totalRedo = 0;

        // Total Specific - Always 0 for Games
        delta.totalSpecific = 0;

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

    updateStatusHandler(currentState: GamesList, payload: StatusPayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.PLAN_TO_PLAY) {
            newState.playtime = 0;
        }

        return [newState, logPayload];
    };

    updatePlaytimeHandler(currentState: GamesList, payload: PlaytimePayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, playtime: payload.playtime };
        const logPayload = { oldValue: currentState.playtime, newValue: payload.playtime };

        return [newState, logPayload];
    };
}
