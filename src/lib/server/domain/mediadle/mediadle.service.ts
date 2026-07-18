import {SearchType} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getImageUrl} from "@/lib/utils/image-url";
import {pixelateImage} from "@/lib/utils/image-pixelation";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";


export interface MediadleEligibility {
    pickEligibleId(excludedMediaIds: number[]): Promise<number | undefined>;
}


export class MediadleService {
    constructor(
        private repository: typeof MediadleRepository,
        private kind: MediaType,
        private eligibility: MediadleEligibility,
    ) {
    }

    async getAllUsersStatsForAdmin(data: SearchType) {
        return this.repository.getAllUsersStatsForAdmin(data);
    }

    async getUserMediadleStats(userId: number) {
        const userMediadleStats = await this.repository.getUserMediadleStats(userId);
        if (!userMediadleStats) return null;

        const attempts = await this.repository.getUserAttempts(userId);

        return { ...userMediadleStats, attempts };
    }

    async getDailyMediadleData(userId?: number) {
        let dailyMediadle = await this.repository.getTodayMediadle(this.kind);

        if (!dailyMediadle) {
            const excludedMediaIds = await this.repository.getUsedMediaIds(this.kind, 200);

            const mediaId = await this.eligibility.pickEligibleId(excludedMediaIds);
            if (!mediaId) throw new FormattedError(`No eligible ${this.kind} found to create a daily mediadle.`);

            dailyMediadle = await this.repository.createDailyMediadle(this.kind, mediaId);
        }

        const selectedMedia = await this.getMediaById(dailyMediadle.mediaId);
        if (!selectedMedia) throw new Error("Media for daily Mediadle not found.");

        let userData = undefined;
        if (userId !== undefined) {
            const userStats = await this.getUserMediadleStats(userId);
            let userProgress = await this.repository.getUserProgress(userId, dailyMediadle.id);
            if (!userProgress) {
                userProgress = await this.repository.createUserProgress(userId, dailyMediadle.id);
            }

            userData = {
                stats: userStats,
                attempts: userProgress.attempts,
                completed: userProgress.completed,
                succeeded: userProgress.succeeded,
            };
        }

        const currentAttempts = userData ? userData.attempts : 0;
        const isCompleted = userData ? userData.completed : false;

        const pixelationLevel = Math.min(dailyMediadle.pixelationLevels, currentAttempts + 1);
        const pixelatedCover = await pixelateImage(selectedMedia.imageCover, pixelationLevel);

        const result = isCompleted
            ? { mediaId: dailyMediadle.mediaId, nonPixelatedCover: selectedMedia.imageCover }
            : null;

        return {
            result,
            userData,
            pixelatedCover,
            mediadleId: dailyMediadle.id,
            maxAttempts: dailyMediadle.pixelationLevels,
        };
    }

    searchSuggestions(query: string) {
        return this.repository.searchMedia(this.kind, query);
    }

    async addMediadleGuess(userId: number, guess: string) {
        const dailyMediadle = await this.repository.getTodayMediadle(this.kind);
        if (!dailyMediadle) throw new FormattedError("Today's mediadle not found");

        const progress = await this.repository.getUserProgress(userId, dailyMediadle.id);
        if (!progress) throw new FormattedError("Progress not found");
        if (progress.completed) throw new FormattedError("Mediadle already completed");

        const selectedMedia = await this.getMediaById(dailyMediadle.mediaId);
        if (!selectedMedia) throw new Error("Media for daily Mediadle not found.");

        const correct = selectedMedia.name.toLowerCase().trim() === guess.toLowerCase().trim();
        const potentialAttempts = progress.attempts + 1;
        const isCompleted = correct || (potentialAttempts >= dailyMediadle.pixelationLevels);

        const updatedProgress = await this.repository.incrementUserAttempts(userId, dailyMediadle.id, isCompleted, correct);
        if (updatedProgress.completed) {
            let userStats = await this.repository.getUserMediadleStats(userId);
            if (!userStats) {
                userStats = await this.repository.createMediadleStats(userId, dailyMediadle.mediaType);
            }
            await this.repository.updateMediadleStats(userStats.id, isCompleted, correct, updatedProgress.attempts);
        }

        return {
            correct,
            completed: isCompleted,
            attempts: updatedProgress.attempts!,
            maxAttempts: dailyMediadle.pixelationLevels!,
        };
    }

    private async getMediaById(mediaId: number) {
        const media = await this.repository.findMediaById(this.kind, mediaId);
        if (!media) return;

        return {
            ...media,
            imageCover: getImageUrl(`${this.kind}-covers`, media.imageCover),
        };
    }
}
