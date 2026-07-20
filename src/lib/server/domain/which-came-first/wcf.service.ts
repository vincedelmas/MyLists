import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {WCF_MAX_ROUNDS, WCF_MEDIA_TYPES} from "@/lib/schemas/wcf.schema";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";


type ActiveRun = NonNullable<Awaited<ReturnType<typeof WcfRepository.getActiveRun>>>;


export class WcfService {
    constructor(
        private repository: typeof WcfRepository,
        private mediaServiceRegistry: typeof MediaServiceRegistry,
    ) {
    }

    async curatePool() {
        for (const mediaType of WCF_MEDIA_TYPES) {
            const mediaService = this.mediaServiceRegistry.get(mediaType);
            const popularMediaRefs = await mediaService.getPopularMediaRefs();
            await this.repository.syncCuratedPool(mediaType, popularMediaRefs);
        }

        return this.repository.countPool();
    }

    async getGameData(userId: number) {
        let poolCounts = await this.repository.countPool();
        if (countPoolMedia(poolCounts) < 2) {
            poolCounts = await this.curatePool();
        }

        if (countPoolMedia(poolCounts) < 2) {
            throw new FormattedError("Not enough media found to create a Which Came First game.");
        }

        const { highestRound, ...stats } = await this.repository.getStats(userId);
        const activeRun = this.repository.getActiveRun(userId);
        const serializedActiveRun = activeRun ? await this._serializeActiveRun(activeRun) : null;

        return {
            activeRun: serializedActiveRun,
            stats: {
                ...stats,
                highestTier: highestRound > 0 ? getGameDifficulty(highestRound).tier : 0,
                accuracy: stats.totalAnswers > 0 ? (stats.correctAnswers / stats.totalAnswers) * 100 : 0,
            },
        };
    }

    async getAdminStats() {
        const [
            summary,
            answerSummary,
            poolByType,
            runsByStatus,
            dailyRuns,
            scoreDistribution,
            mediaTypeUsage,
            roundAccuracy,
            topPlayers,
            recentRuns,
        ] = await Promise.all([
            this.repository.getAdminSummary(),
            this.repository.getAdminAnswerSummary(),
            this.repository.getAdminPoolByType(),
            this.repository.getAdminRunsByStatus(),
            this.repository.getAdminDailyRuns(30),
            this.repository.getAdminScoreDistribution(),
            this.repository.getAdminMediaTypeUsage(),
            this.repository.getAdminRoundAccuracy(),
            this.repository.getAdminTopPlayers(8),
            this.repository.getAdminRecentRuns(12),
        ]);

        const poolByTypeMap = new Map(poolByType.map((row) => [row.mediaType, row]));
        const runsByStatusMap = new Map(runsByStatus.map((row) => [row.status, row.count]));
        const mediaTypeUsageMap = new Map(mediaTypeUsage.map((row) => [row.mediaType, row]));
        const roundAccuracyMap = new Map(roundAccuracy.map((row) => [row.roundNumber, row]));

        return {
            summary: {
                ...summary,
                ...answerSummary,
                capRate: summary.endedPlayedRuns > 0 ? (summary.cappedRuns / summary.endedPlayedRuns) * 100 : 0,
                accuracy: answerSummary.totalAnswers > 0 ? (answerSummary.correctAnswers / answerSummary.totalAnswers) * 100 : 0,
            },
            dailyRuns,
            recentRuns,
            scoreDistribution,
            poolByType: WCF_MEDIA_TYPES.map((mediaType) => ({
                mediaType,
                count: Number(poolByTypeMap.get(mediaType)?.count ?? 0),
                oldestReleaseDate: poolByTypeMap.get(mediaType)?.oldestReleaseDate ?? null,
                newestReleaseDate: poolByTypeMap.get(mediaType)?.newestReleaseDate ?? null,
            })),
            runsByStatus: (["active", "won", "lost", "exhausted", "abandoned"] as const).map((status) => ({
                status,
                count: runsByStatusMap.get(status) ?? 0,
            })),
            mediaTypeUsage: WCF_MEDIA_TYPES.map((mediaType) => ({
                mediaType,
                selectedCount: mediaTypeUsageMap.get(mediaType)?.selectedCount ?? 0,
                roundAppearances: mediaTypeUsageMap.get(mediaType)?.roundAppearances ?? 0,
            })),
            roundAccuracy: Array.from({ length: WCF_MAX_ROUNDS }, (_value, index) => {
                const roundNumber = index + 1;
                return roundAccuracyMap.get(roundNumber) ?? {
                    roundNumber,
                    accuracy: 0,
                    totalAnswers: 0,
                    correctAnswers: 0,
                };
            }),
            topPlayers: topPlayers.map((player) => ({
                ...player,
                accuracy: player.totalAnswers > 0 ? (player.correctAnswers / player.totalAnswers) * 100 : 0,
            })),
        };
    }

    async startRun(userId: number, mediaTypes: MediaType[]) {
        const poolCounts = await this.repository.countPool(mediaTypes);
        const totalEligible = poolCounts.reduce((total, row) => total + row.count, 0);
        if (totalEligible < 2) {
            throw new FormattedError("There are not enough media in the selected categories.");
        }

        const newRun = await this.repository.createRun(userId, mediaTypes);
        await this._createNextRound(newRun);

        const activeRun = this.repository.getActiveRun(userId);
        if (!activeRun) throw new FormattedError("Unable to start a new run.");

        return this._serializeActiveRun(activeRun);
    }

    async answerRound(userId: number, runId: number, roundId: number, selectedSide: "left" | "right") {
        const result = await this.repository.answerRound(userId, runId, roundId, selectedSide);
        const dateDifferenceDays = Math.round(Math.abs(
            new Date(`${result.round.leftReleaseDate}T00:00:00Z`).getTime()
            - new Date(`${result.round.rightReleaseDate}T00:00:00Z`).getTime(),
        ) / (24 * 60 * 60 * 1000));

        let poolExhausted = false;
        if (result.correct && result.run.score < WCF_MAX_ROUNDS) {
            const nextRound = await this._tryCreateNextRound(result.run);
            if (!nextRound) {
                await this.repository.exhaustRun(result.run.id);
                poolExhausted = true;
            }
        }

        return {
            selectedSide,
            dateDifferenceDays,
            score: result.run.score,
            correct: result.correct,
            won: result.run.status === "won",
            poolExhausted,
            runEnded: result.run.status !== "active" || poolExhausted,
            correctSide: result.correctSide,
            leftReleaseDate: result.round.leftReleaseDate,
            rightReleaseDate: result.round.rightReleaseDate,
        };
    }

    async abandonRun(userId: number, runId: number) {
        await this.repository.abandonRun(userId, runId);
    }

    async resetStats(userId: number) {
        if (this.repository.getActiveRun(userId)) {
            throw new FormattedError("Finish or abandon your active run before resetting statistics.");
        }

        await this.repository.deleteUserRuns(userId);
    }

    async deletePoolMedia(mediaType: MediaType, mediaIds: number[]) {
        await this.repository.deletePoolMedia(mediaType, mediaIds);
    }

    private async _serializeActiveRun(activeRun: ActiveRun) {
        const difficulty = getGameDifficulty(activeRun.score + 1);
        let activeRound = this.repository.getActiveRound(activeRun.id) ?? await this._createNextRound(activeRun);

        let [leftMedia, rightMedia] = await Promise.all([
            this._getMedia(activeRound.leftMediaType, activeRound.leftMediaId),
            this._getMedia(activeRound.rightMediaType, activeRound.rightMediaId),
        ]);

        if (!leftMedia || !rightMedia) {
            await this.repository.deleteOpenRound(activeRound.id);
            activeRound = await this._createNextRound(activeRun);

            [leftMedia, rightMedia] = await Promise.all([
                this._getMedia(activeRound.leftMediaType, activeRound.leftMediaId),
                this._getMedia(activeRound.rightMediaType, activeRound.rightMediaId),
            ]);
        }

        if (!leftMedia || !rightMedia) {
            throw new FormattedError("Unable to create a playable round.");
        }

        return {
            id: activeRun.id,
            score: activeRun.score,
            selectedMediaTypes: activeRun.selectedMediaTypes,
            round: {
                left: leftMedia,
                right: rightMedia,
                id: activeRound.id,
                number: activeRun.score + 1,
                difficulty: difficulty.label,
            },
        };
    }

    private async _getMedia(mediaType: MediaType, mediaId: number) {
        const mediaService = this.mediaServiceRegistry.get(mediaType);
        const mediaDetails = await mediaService.findById(mediaId);
        if (!mediaDetails) return undefined;

        return {
            mediaId,
            mediaType,
            name: mediaDetails.name,
            imageCover: mediaDetails.imageCover,
        };
    }

    private async _createNextRound(activeRun: ActiveRun) {
        const round = await this._tryCreateNextRound(activeRun);
        if (round) return round;

        const difficulty = getGameDifficulty(activeRun.score + 1);
        throw new FormattedError(`No media pair available for the ${difficulty.label} difficulty.`);
    }

    private async _tryCreateNextRound(activeRun: ActiveRun) {
        const difficulty = getGameDifficulty(activeRun.score + 1);
        const pair = await this._findPair(activeRun, difficulty.minDays, difficulty.maxDays, true)
            ?? await this._findPair(activeRun, difficulty.minDays, difficulty.maxDays, false);

        if (!pair) return;

        return this.repository.createRound({
            runId: activeRun.id,
            leftMediaId: pair.leftMediaId,
            rightMediaId: pair.rightMediaId,
            roundNumber: activeRun.score + 1,
            leftMediaType: pair.leftMediaType,
            rightMediaType: pair.rightMediaType,
            leftReleaseDate: pair.leftReleaseDate,
            rightReleaseDate: pair.rightReleaseDate,
        });
    }

    private async _findPair(activeRun: ActiveRun, minDays: number, maxDays: number | null, excludeRecent: boolean) {
        const mediaTypes = activeRun.selectedMediaTypes;

        for (let attempt = 0; attempt < 50; attempt += 1) {
            const leftType = randomItem(mediaTypes);
            const rightType = randomItem(mediaTypes);

            const mediaPair = await this.repository.findPair(activeRun.id, leftType, rightType, minDays, maxDays, excludeRecent);
            if (mediaPair) {
                return mediaPair;
            }
        }
    }
}


const GAME_DIFFICULTY = [
    { tier: 1, fromRound: 1, toRound: 3, minDays: 3652, maxDays: 14610, label: "10–40 years" },
    { tier: 2, fromRound: 4, toRound: 7, minDays: 1826, maxDays: 3651, label: "5–10 years" },
    { tier: 3, fromRound: 8, toRound: 12, minDays: 731, maxDays: 1825, label: "2–5 years" },
    { tier: 4, fromRound: 13, toRound: 20, minDays: 365, maxDays: 730, label: "1–2 years" },
    { tier: 5, fromRound: 21, toRound: 30, minDays: 90, maxDays: 364, label: "3–12 months" },
] as const;


const randomItem = <T>(items: T[]) => {
    return items[Math.floor(Math.random() * items.length)];
}


const countPoolMedia = (poolCounts: { count: number }[]) => {
    return poolCounts.reduce((total, row) => total + row.count, 0);
}


const getGameDifficulty = (round: number) => {
    return GAME_DIFFICULTY.find(tier => round >= tier.fromRound && round <= tier.toRound) ?? GAME_DIFFICULTY.at(-1)!;
}
