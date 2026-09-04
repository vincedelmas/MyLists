import type {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {WCF_MAX_ROUNDS} from "@/lib/schemas/wcf.schema";
import type {WcfCatalogRegistry} from "@/lib/server/domain/which-came-first/wcf-catalog";
import type {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";


type ActiveRun = NonNullable<Awaited<ReturnType<WcfRepository["getActiveRun"]>>>;


export const createWcfService = (repository: WcfRepository, catalogRegistry: WcfCatalogRegistry) => {
    const service = {
        async curatePool() {
            for (const catalog of catalogRegistry.catalogs) {
                const popularMediaRefs = await catalog.getPopularMediaRefs();
                await repository.syncCuratedPool(catalog.mediaType, popularMediaRefs);
            }

            return repository.countPool();
        },

        async getGameData(userId: number) {
            let poolCounts = await repository.countPool();
            if (countPoolMedia(poolCounts) < 2) {
                poolCounts = await service.curatePool();
            }

            if (countPoolMedia(poolCounts) < 2) {
                throw new FormattedError("Not enough media found to create a Which Came First game.");
            }

            const activeRun = repository.getActiveRun(userId);
            const leaderboard = repository.getLeaderboard(userId);

            const { highestRound, ...stats } = await repository.getStats(userId);
            const serializedActiveRun = activeRun ? await serializeActiveRun(activeRun) : null;

            return {
                leaderboard,
                activeRun: serializedActiveRun,
                stats: {
                    ...stats,
                    highestTier: highestRound > 0 ? getGameDifficulty(highestRound).tier : 0,
                    accuracy: stats.totalAnswers > 0 ? (stats.correctAnswers / stats.totalAnswers) * 100 : 0,
                },
            };
        },

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
                repository.getAdminSummary(),
                repository.getAdminAnswerSummary(),
                repository.getAdminPoolByType(),
                repository.getAdminRunsByStatus(),
                repository.getAdminDailyRuns(30),
                repository.getAdminScoreDistribution(),
                repository.getAdminMediaTypeUsage(),
                repository.getAdminRoundAccuracy(),
                repository.getAdminTopPlayers(8),
                repository.getAdminRecentRuns(12),
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
                poolByType: catalogRegistry.catalogs.map(({ mediaType }) => ({
                    mediaType,
                    count: Number(poolByTypeMap.get(mediaType)?.count ?? 0),
                    oldestReleaseDate: poolByTypeMap.get(mediaType)?.oldestReleaseDate ?? null,
                    newestReleaseDate: poolByTypeMap.get(mediaType)?.newestReleaseDate ?? null,
                })),
                runsByStatus: (["active", "won", "lost", "exhausted", "abandoned"] as const).map((status) => ({
                    status,
                    count: runsByStatusMap.get(status) ?? 0,
                })),
                mediaTypeUsage: catalogRegistry.catalogs.map(({ mediaType }) => ({
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
        },

        async startRun(userId: number, mediaTypes: MediaType[]) {
            const poolCounts = await repository.countPool(mediaTypes);
            const totalEligible = poolCounts.reduce((total, row) => total + row.count, 0);
            if (totalEligible < 2) {
                throw new FormattedError("There are not enough media in the selected categories.");
            }

            const newRun = await repository.createRun(userId, mediaTypes);
            await createNextRound(newRun);

            const activeRun = repository.getActiveRun(userId);
            if (!activeRun) throw new FormattedError("Unable to start a new run.");

            return serializeActiveRun(activeRun);
        },

        async answerRound(userId: number, runId: number, roundId: number, selectedSide: "left" | "right") {
            const result = await repository.answerRound(userId, runId, roundId, selectedSide);
            const dateDifferenceDays = Math.round(Math.abs(
                new Date(`${result.round.leftReleaseDate}T00:00:00Z`).getTime()
                - new Date(`${result.round.rightReleaseDate}T00:00:00Z`).getTime(),
            ) / (24 * 60 * 60 * 1000));

            let poolExhausted = false;
            if (result.correct && result.run.score < WCF_MAX_ROUNDS) {
                const nextRound = await tryCreateNextRound(result.run);
                if (!nextRound) {
                    await repository.exhaustRun(result.run.id);
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
        },

        async abandonRun(userId: number, runId: number) {
            await repository.abandonRun(userId, runId);
        },

        async resetStats(userId: number) {
            if (repository.getActiveRun(userId)) {
                throw new FormattedError("Finish or abandon your active run before resetting statistics.");
            }

            await repository.deleteUserRuns(userId);
        },

        async deletePoolMedia(mediaType: MediaType, mediaIds: number[]) {
            await repository.deletePoolMedia(mediaType, mediaIds);
        },
    };

    async function serializeActiveRun(activeRun: ActiveRun) {
        const difficulty = getGameDifficulty(activeRun.score + 1);
        let activeRound = repository.getActiveRound(activeRun.id) ?? await createNextRound(activeRun);

        let [leftMedia, rightMedia] = await Promise.all([
            getMedia(activeRound.leftMediaType, activeRound.leftMediaId),
            getMedia(activeRound.rightMediaType, activeRound.rightMediaId),
        ]);

        if (!leftMedia || !rightMedia) {
            await repository.deleteOpenRound(activeRound.id);
            activeRound = await createNextRound(activeRun);

            [leftMedia, rightMedia] = await Promise.all([
                getMedia(activeRound.leftMediaType, activeRound.leftMediaId),
                getMedia(activeRound.rightMediaType, activeRound.rightMediaId),
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

    async function getMedia(mediaType: MediaType, mediaId: number) {
        const mediaDetails = await catalogRegistry.get(mediaType).findById(mediaId);
        if (!mediaDetails) return undefined;

        return {
            mediaId,
            mediaType,
            name: mediaDetails.name,
            imageCover: mediaDetails.imageCover,
        };
    }

    async function createNextRound(activeRun: ActiveRun) {
        const round = await tryCreateNextRound(activeRun);
        if (round) return round;

        const difficulty = getGameDifficulty(activeRun.score + 1);
        throw new FormattedError(`No media pair available for the ${difficulty.label} difficulty.`);
    }

    async function tryCreateNextRound(activeRun: ActiveRun) {
        const difficulty = getGameDifficulty(activeRun.score + 1);
        const pair = await findPair(activeRun, difficulty.minDays, difficulty.maxDays, true)
            ?? await findPair(activeRun, difficulty.minDays, difficulty.maxDays, false);

        if (!pair) return;

        return repository.createRound({
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

    async function findPair(activeRun: ActiveRun, minDays: number, maxDays: number | null, excludeRecent: boolean) {
        const mediaTypes = activeRun.selectedMediaTypes;

        for (let attempt = 0; attempt < 50; attempt += 1) {
            const leftType = randomItem(mediaTypes);
            const rightType = randomItem(mediaTypes);

            const mediaPair = await repository.findPair(
                activeRun.id,
                leftType,
                rightType,
                minDays,
                maxDays,
                excludeRecent,
            );
            if (mediaPair) return mediaPair;
        }
    }

    return service;
};


export type WcfService = ReturnType<typeof createWcfService>;


const GAME_DIFFICULTY = [
    { tier: 1, fromRound: 1, toRound: 3, minDays: 3652, maxDays: 14610, label: "10–40 years" },
    { tier: 2, fromRound: 4, toRound: 7, minDays: 1826, maxDays: 3651, label: "5–10 years" },
    { tier: 3, fromRound: 8, toRound: 12, minDays: 731, maxDays: 1825, label: "2–5 years" },
    { tier: 4, fromRound: 13, toRound: 20, minDays: 365, maxDays: 730, label: "1–2 years" },
    { tier: 5, fromRound: 21, toRound: 30, minDays: 90, maxDays: 364, label: "3–12 months" },
] as const;


const randomItem = <T>(items: T[]) => {
    return items[Math.floor(Math.random() * items.length)];
};


const countPoolMedia = (poolCounts: { count: number }[]) => {
    return poolCounts.reduce((total, row) => total + row.count, 0);
};


const getGameDifficulty = (round: number) => {
    return GAME_DIFFICULTY.find((tier) => round >= tier.fromRound && round <= tier.toRound) ?? GAME_DIFFICULTY.at(-1)!;
};
