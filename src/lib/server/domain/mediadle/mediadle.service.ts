import {FormattedError} from "@/lib/utils/error-classes";
import {withTransaction} from "@/lib/server/database/async-storage";
import {pixelateImage} from "@/lib/server/domain/mediadle/image-pixelation";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";


export class MediadleService {
    constructor(private repository: typeof MediadleRepository) {
    }

    getLeaderboard(currentUserId?: number) {
        return this.repository.getLeaderboard(currentUserId);
    }

    getUserMediadleStats(userId: number) {
        const userMediadleStats = this.repository.getUserMediadleStats(userId);
        if (!userMediadleStats) {
            return null;
        }

        const attempts = this.repository.getUserAttempts(userId);

        return { ...userMediadleStats, attempts };
    }

    async getDailyMediadleData(mediaService: MoviesService, userId?: number) {
        const { dailyMediadle, selectedMovie, userData } = withTransaction(() => {
            let dailyMediadle = this.repository.getTodayMoviedle();
            if (!dailyMediadle) {
                dailyMediadle = this.repository.createDailyMoviedle();
            }

            const selectedMovie = mediaService.findById(dailyMediadle.mediaId);
            if (!selectedMovie) {
                throw new Error("mediaId for mediadle not found");
            }

            let userData = undefined;
            if (userId) {
                const userStats = this.getUserMediadleStats(userId);
                let userProgress = this.repository.getUserProgress(userId, dailyMediadle.id);
                if (!userProgress) {
                    userProgress = this.repository.createUserProgress(userId, dailyMediadle.id);
                }

                userData = {
                    stats: userStats,
                    attempts: userProgress.attempts,
                    completed: userProgress.completed,
                    succeeded: userProgress.succeeded,
                };
            }

            return { dailyMediadle, selectedMovie, userData };
        });

        const currentAttempts = userData ? userData.attempts : 0;
        const isCompleted = userData ? userData.completed : false;

        const pixelationLevel = Math.min(dailyMediadle.pixelationLevels, currentAttempts + 1);
        const pixelatedCover = await pixelateImage(selectedMovie.imageCover, pixelationLevel);

        const result = isCompleted
            ? { mediaId: dailyMediadle.mediaId, nonPixelatedCover: selectedMovie.imageCover }
            : null;

        return {
            result,
            userData,
            pixelatedCover,
            mediadleId: dailyMediadle.id,
            maxAttempts: dailyMediadle.pixelationLevels,
        };
    }

    addMediadleGuess(userId: number, guess: string, movieService: MoviesService) {
        return withTransaction(() => {
            const dailyMediadle = this.repository.getTodayMoviedle();
            if (!dailyMediadle) {
                throw new FormattedError("Today's mediadle not found");
            }

            const progress = this.repository.getUserProgress(userId, dailyMediadle.id);
            if (!progress) throw new FormattedError("Progress not found");
            if (progress.completed) throw new FormattedError("Mediadle already completed");

            const selectedMovie = movieService.findById(dailyMediadle.mediaId);
            if (!selectedMovie) throw new Error("mediaId for mediadle not found");

            const correct = selectedMovie.name.toLowerCase().trim() === guess.toLowerCase().trim();
            const potentialAttempts = progress.attempts + 1;
            const isCompleted = correct || (potentialAttempts >= dailyMediadle.pixelationLevels);

            const updatedProgress = this.repository.incrementUserAttempts(userId, dailyMediadle.id, isCompleted, correct);
            if (updatedProgress.completed) {
                let stats = this.repository.getUserMediadleStats(userId);
                if (!stats) stats = this.repository.createMediadleStats(userId, dailyMediadle.mediaType);
                this.repository.updateMediadleStats(stats.id, isCompleted, correct, updatedProgress.attempts!);
            }

            return {
                correct,
                completed: isCompleted,
                attempts: updatedProgress.attempts!,
                maxAttempts: dailyMediadle.pixelationLevels!,
            };
        });
    }
}
