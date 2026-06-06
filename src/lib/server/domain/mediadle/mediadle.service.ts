import {SearchType} from "@/lib/schemas";
import {FormattedError} from "@/lib/utils/error-classes";
import {pixelateImage} from "@/lib/utils/image-pixelation";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";


export class MediadleService {
    constructor(private repository: typeof MediadleRepository) {
    }

    async getAllUsersStatsForAdmin(data: SearchType) {
        return this.repository.getAllUsersStatsForAdmin(data);
    }

    async getUserMediadleStats(userId: number) {
        const userMediadleStats = await this.repository.getUserMediadleStats(userId);
        if (!userMediadleStats) {
            return null;
        }

        const attempts = await this.repository.getUserAttempts(userId);

        return { ...userMediadleStats, attempts };
    }

    async getDailyMediadleData(mediaService: MoviesService, userId?: number) {
        let dailyMediadle = await this.repository.getTodayMoviedle();
        if (!dailyMediadle) {
            dailyMediadle = await this.repository.createDailyMoviedle();
        }

        const selectedMovie = await mediaService.findById(dailyMediadle.mediaId);
        if (!selectedMovie) {
            throw new Error("mediaId for mediadle not found");
        }

        let userData = undefined;
        if (userId) {
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

    async addMediadleGuess(userId: number, guess: string, movieService: MoviesService) {
        const dailyMediadle = await this.repository.getTodayMoviedle();
        if (!dailyMediadle) {
            throw new FormattedError("Today's mediadle not found");
        }

        const progress = await this.repository.getUserProgress(userId, dailyMediadle.id);
        if (!progress) throw new FormattedError("Progress not found");
        if (progress.completed) throw new FormattedError("Mediadle already completed");

        const selectedMovie = await movieService.findById(dailyMediadle.mediaId);
        if (!selectedMovie) throw new Error("mediaId for mediadle not found");

        const correct = selectedMovie.name.toLowerCase().trim() === guess.toLowerCase().trim();
        const potentialAttempts = progress.attempts + 1;
        const isCompleted = correct || (potentialAttempts >= dailyMediadle.pixelationLevels);

        const updatedProgress = await this.repository.incrementUserAttempts(userId, dailyMediadle.id, isCompleted, correct);
        if (updatedProgress.completed) {
            let stats = await this.repository.getUserMediadleStats(userId);
            if (!stats) stats = await this.repository.createMediadleStats(userId, dailyMediadle.mediaType);
            await this.repository.updateMediadleStats(stats.id, isCompleted, correct, updatedProgress.attempts!);
        }

        return {
            correct,
            completed: isCompleted,
            attempts: updatedProgress.attempts!,
            maxAttempts: dailyMediadle.pixelationLevels!,
        };
    }
}
