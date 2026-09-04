import type {SearchType} from "@/lib/schemas";
import type {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {pixelateImage} from "@/lib/utils/image-pixelation";
import type {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import type {MediadleCatalogRegistry} from "@/lib/server/domain/mediadle/mediadle-catalog";


export const createMediadleService = (repository: MediadleRepository, catalogRegistry: MediadleCatalogRegistry) => {
    const service = {
        async getAllUsersStatsForAdmin(mediaType: MediaType, data: SearchType) {
            return repository.getAllUsersStatsForAdmin(mediaType, data);
        },

        async getLeaderboard(mediaType: MediaType, currentUserId?: number) {
            return repository.getLeaderboard(mediaType, currentUserId);
        },

        async getUserMediadleStats(mediaType: MediaType, userId: number) {
            const userMediadleStats = await repository.getUserMediadleStats(userId, mediaType);
            if (!userMediadleStats) return null;

            const attempts = await repository.getUserAttempts(userId, mediaType);

            return { ...userMediadleStats, attempts };
        },

        async searchSuggestions(mediaType: MediaType, query: string) {
            return catalogRegistry.get(mediaType).searchSuggestions(query);
        },

        async getDailyMediadleData(mediaType: MediaType, userId?: number) {
            const catalog = catalogRegistry.get(mediaType);
            let dailyMediadle = await repository.getTodayMediadle(mediaType);

            if (!dailyMediadle) {
                const recentMediaIds = await repository.getRecentMediaIds(mediaType);
                const mediaId = await catalog.findDailyCandidateId(recentMediaIds);
                if (mediaId === undefined) {
                    throw new FormattedError(`No media found to create today's ${mediaType} mediadle.`);
                }

                dailyMediadle = await repository.createDailyMediadle(mediaType, mediaId);
            }

            const selectedMedia = await catalog.findById(dailyMediadle.mediaId);
            if (!selectedMedia) {
                throw new Error(`Media ${dailyMediadle.mediaId} not found for ${mediaType} mediadle`);
            }

            let userData;
            if (userId !== undefined) {
                const userStats = await service.getUserMediadleStats(mediaType, userId);
                let userProgress = await repository.getUserProgress(userId, dailyMediadle.id);
                if (!userProgress) {
                    userProgress = await repository.createUserProgress(userId, dailyMediadle.id);
                }

                userData = {
                    stats: userStats,
                    attempts: userProgress.attempts,
                    completed: userProgress.completed,
                    succeeded: userProgress.succeeded,
                };
            }

            const currentAttempts = userData?.attempts ?? 0;
            const isCompleted = userData?.completed ?? false;
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
        },

        async addMediadleGuess(mediaType: MediaType, userId: number, guess: string) {
            const catalog = catalogRegistry.get(mediaType);
            const dailyMediadle = await repository.getTodayMediadle(mediaType);
            if (!dailyMediadle) throw new FormattedError("Today's mediadle not found");

            const progress = await repository.getUserProgress(userId, dailyMediadle.id);
            if (!progress) throw new FormattedError("Progress not found");
            if (progress.completed) throw new FormattedError("Mediadle already completed");

            const selectedMedia = await catalog.findById(dailyMediadle.mediaId);
            if (!selectedMedia) {
                throw new Error(`Media ${dailyMediadle.mediaId} not found for ${mediaType} mediadle`);
            }

            const correct = selectedMedia.name.toLowerCase().trim() === guess.toLowerCase().trim();
            const potentialAttempts = progress.attempts + 1;
            const isCompleted = correct || potentialAttempts >= dailyMediadle.pixelationLevels;

            const updatedProgress = await repository.incrementUserAttempts(
                userId,
                dailyMediadle.id,
                isCompleted,
                correct,
            );

            if (updatedProgress.completed) {
                let stats = await repository.getUserMediadleStats(userId, mediaType);
                if (!stats) stats = await repository.createMediadleStats(userId, mediaType);
                await repository.updateMediadleStats(stats.id, isCompleted, correct, updatedProgress.attempts);
            }

            return {
                correct,
                completed: isCompleted,
                attempts: updatedProgress.attempts,
                maxAttempts: dailyMediadle.pixelationLevels,
            };
        },
    };

    return service;
};


export type MediadleService = ReturnType<typeof createMediadleService>;
