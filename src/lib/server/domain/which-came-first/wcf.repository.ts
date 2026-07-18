import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {WCF_MAX_ROUNDS} from "@/lib/utils/constants";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, desc, eq, gt, inArray, isNotNull, isNull, lte, ne, or, SQL, sql} from "drizzle-orm";
import {catalogItem, user, whichCameFirstMedia, whichCameFirstRounds, whichCameFirstRuns} from "@/lib/server/database/schema";


type WcfPair = {
    leftMediaId: number;
    rightMediaId: number;
    leftReleaseDate: string;
    leftMediaType: MediaType;
    rightReleaseDate: string;
    rightMediaType: MediaType;
};


/** Common WCF requirements composed with each media's popularity policy. */
export const wcfEligibility = (kind: MediaType, popularity: SQL) => and(
    eq(catalogItem.kind, kind),
    popularity,
    isNotNull(catalogItem.releaseDate),
    ne(catalogItem.imageCover, "default.jpg"),
    ne(catalogItem.releaseDate, ""),
    lte(catalogItem.releaseDate, sql`date('now')`),
);


export class WcfRepository {
    static async findMediaById(kind: MediaType, mediaId: number) {
        return getDbClient()
            .select({
                name: catalogItem.name,
                imageCover: catalogItem.imageCover,
            })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, kind), eq(catalogItem.id, mediaId)))
            .get();
    }

    static async syncCuratedPool(mediaType: MediaType, mediaRefs: { id: number; releaseDate: string }[]) {
        await getDbClient()
            .delete(whichCameFirstMedia)
            .where(eq(whichCameFirstMedia.mediaType, mediaType));

        await getDbClient()
            .insert(whichCameFirstMedia)
            .values(mediaRefs.map((media) => ({
                mediaType,
                mediaId: media.id,
                releaseDate: media.releaseDate,
            })));
    }

    static async countPool(mediaTypes?: MediaType[]) {
        return getDbClient()
            .select({
                count: sql<number>`count(*)`,
                mediaType: whichCameFirstMedia.mediaType,
            })
            .from(whichCameFirstMedia)
            .where(mediaTypes?.length ? inArray(whichCameFirstMedia.mediaType, mediaTypes) : undefined)
            .groupBy(whichCameFirstMedia.mediaType);
    }

    static async findPair(runId: number, leftType: MediaType, rightType: MediaType, minDays: number, maxDays: number | null, excludeRecent: boolean) {
        const dateDiff = sql`ABS(julianday(first_candidate.release_date) - julianday(second_candidate.release_date))`;
        const dateFilter = maxDays === null
            ? sql`${dateDiff} >= ${minDays}`
            : sql`${dateDiff} BETWEEN ${minDays} AND ${maxDays}`;

        const rows = getDbClient().all<WcfPair>(sql`
            WITH eligible AS (
                SELECT
                    pool.media_id,
                    pool.media_type,
                    pool.release_date
                FROM which_came_first_media pool
                WHERE pool.media_type IN (${leftType}, ${rightType})
                    AND pool.release_date <= date('now')
            ),
            recent AS (
                SELECT 
                    left_media_type, 
                    left_media_id, 
                    right_media_type, 
                    right_media_id
                FROM which_came_first_rounds
                WHERE run_id = ${runId}
                ORDER BY round_number DESC
                LIMIT 10
            ),
            first_candidate AS (
                SELECT first_candidate.*
                FROM eligible first_candidate
                WHERE first_candidate.media_type = ${leftType}
                    ${excludeRecent ? recentMediaFilter("first_candidate") : sql``}
                ORDER BY random()
                LIMIT 1
            )
            SELECT
                first_candidate.media_type AS leftMediaType,
                first_candidate.media_id AS leftMediaId,
                first_candidate.release_date AS leftReleaseDate,
                second_candidate.media_type AS rightMediaType,
                second_candidate.media_id AS rightMediaId,
                second_candidate.release_date AS rightReleaseDate
            FROM first_candidate
            INNER JOIN eligible second_candidate
                ON second_candidate.media_type = ${rightType}
                AND NOT (
                    second_candidate.media_type = first_candidate.media_type
                    AND second_candidate.media_id = first_candidate.media_id
                )
            WHERE ${dateFilter}
                ${excludeRecent ? recentMediaFilter("second_candidate") : sql``}
                AND NOT EXISTS (
                    SELECT 1
                    FROM which_came_first_rounds played
                    WHERE played.run_id = ${runId}
                        AND (
                            (
                                played.left_media_type = first_candidate.media_type
                                AND played.left_media_id = first_candidate.media_id
                                AND played.right_media_type = second_candidate.media_type
                                AND played.right_media_id = second_candidate.media_id
                            )
                            OR (
                                played.left_media_type = second_candidate.media_type
                                AND played.left_media_id = second_candidate.media_id
                                AND played.right_media_type = first_candidate.media_type
                                AND played.right_media_id = first_candidate.media_id
                            )
                        )
                )
            ORDER BY random()
            LIMIT 1
        `);

        return rows[0];
    }

    static getActiveRun(userId: number) {
        return getDbClient()
            .select()
            .from(whichCameFirstRuns)
            .where(and(eq(whichCameFirstRuns.userId, userId), eq(whichCameFirstRuns.status, "active")))
            .orderBy(desc(whichCameFirstRuns.id))
            .get();
    }

    static async createRun(userId: number, mediaTypes: MediaType[]) {
        await getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "abandoned", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(whichCameFirstRuns.userId, userId), eq(whichCameFirstRuns.status, "active")));

        const [run] = await getDbClient()
            .insert(whichCameFirstRuns)
            .values({ userId, selectedMediaTypes: mediaTypes })
            .returning();

        return run;
    }

    static getActiveRound(runId: number) {
        return getDbClient()
            .select()
            .from(whichCameFirstRounds)
            .where(and(eq(whichCameFirstRounds.runId, runId), isNull(whichCameFirstRounds.answeredAt)))
            .get();
    }

    static async createRound(data: typeof whichCameFirstRounds.$inferInsert) {
        const [round] = await getDbClient()
            .insert(whichCameFirstRounds)
            .values(data)
            .returning();

        return round;
    }

    static async deleteOpenRound(roundId: number) {
        await getDbClient()
            .delete(whichCameFirstRounds)
            .where(and(eq(whichCameFirstRounds.id, roundId), isNull(whichCameFirstRounds.answeredAt)));
    }

    static async answerRound(userId: number, runId: number, roundId: number, selectedSide: "left" | "right") {
        const run = getDbClient()
            .select()
            .from(whichCameFirstRuns)
            .where(and(
                eq(whichCameFirstRuns.id, runId),
                eq(whichCameFirstRuns.userId, userId),
                eq(whichCameFirstRuns.status, "active"),
            ))
            .get();
        if (!run) throw new FormattedError("Active game not found.");

        const round = getDbClient()
            .select()
            .from(whichCameFirstRounds)
            .where(and(
                eq(whichCameFirstRounds.id, roundId),
                eq(whichCameFirstRounds.runId, runId),
                isNull(whichCameFirstRounds.answeredAt),
            ))
            .get();
        if (!round) throw new FormattedError("This round has already been answered.");

        const correctSide = round.leftReleaseDate < round.rightReleaseDate ? "left" : "right";
        const correct = selectedSide === correctSide;
        const [updatedRound] = await getDbClient()
            .update(whichCameFirstRounds)
            .set({ selectedSide, correct, answeredAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(whichCameFirstRounds.id, roundId), isNull(whichCameFirstRounds.answeredAt)))
            .returning();
        if (!updatedRound) throw new FormattedError("This round has already been answered.");

        const [updatedRun] = await getDbClient()
            .update(whichCameFirstRuns)
            .set(correct
                ? {
                    score: sql`${whichCameFirstRuns.score} + 1`,
                    status: sql`CASE
                        WHEN ${whichCameFirstRuns.score} + 1 >= ${WCF_MAX_ROUNDS} THEN 'won'
                        ELSE ${whichCameFirstRuns.status}
                    END`,
                    completedAt: sql`CASE
                        WHEN ${whichCameFirstRuns.score} + 1 >= ${WCF_MAX_ROUNDS} THEN CURRENT_TIMESTAMP
                        ELSE ${whichCameFirstRuns.completedAt}
                    END`,
                }
                : { status: "lost", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(whichCameFirstRuns.id, runId), eq(whichCameFirstRuns.status, "active")))
            .returning();

        return {
            correct,
            correctSide,
            run: updatedRun,
            round: updatedRound,
        };
    }

    static async abandonRun(userId: number, runId: number) {
        await getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "abandoned", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(
                eq(whichCameFirstRuns.id, runId),
                eq(whichCameFirstRuns.userId, userId),
                eq(whichCameFirstRuns.status, "active"),
            ));
    }

    static async exhaustRun(runId: number) {
        await getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "exhausted", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(
                eq(whichCameFirstRuns.id, runId),
                eq(whichCameFirstRuns.status, "active"),
            ));
    }

    static async deleteUserRuns(userId: number) {
        await getDbClient()
            .delete(whichCameFirstRuns)
            .where(eq(whichCameFirstRuns.userId, userId));
    }

    static async getStats(userId: number) {
        const runStats = getDbClient()
            .select({
                runsPlayed: sql<number>`count(*)`,
                bestScore: sql<number>`coalesce(max(${whichCameFirstRuns.score}), 0)`,
                averageScore: sql<number>`coalesce(avg(${whichCameFirstRuns.score}), 0)`,
            })
            .from(whichCameFirstRuns)
            .where(and(
                eq(whichCameFirstRuns.userId, userId),
                or(
                    eq(whichCameFirstRuns.status, "won"),
                    eq(whichCameFirstRuns.status, "lost"),
                    eq(whichCameFirstRuns.status, "exhausted"),
                    and(eq(whichCameFirstRuns.status, "abandoned"), gt(whichCameFirstRuns.score, 0)),
                ),
            ))
            .get();

        const answerStats = getDbClient()
            .select({
                totalAnswers: sql<number>`count(*)`,
                highestRound: sql<number>`coalesce(max(${whichCameFirstRounds.roundNumber}), 0)`,
                correctAnswers: sql<number>`coalesce(sum(CASE WHEN ${whichCameFirstRounds.correct} = 1 THEN 1 ELSE 0 END), 0)`,
            })
            .from(whichCameFirstRounds)
            .innerJoin(whichCameFirstRuns, eq(whichCameFirstRounds.runId, whichCameFirstRuns.id))
            .where(and(
                eq(whichCameFirstRuns.userId, userId),
                or(eq(whichCameFirstRounds.correct, true), eq(whichCameFirstRounds.correct, false)),
            ))
            .get();

        return {
            bestScore: runStats?.bestScore ?? 0,
            runsPlayed: runStats?.runsPlayed ?? 0,
            averageScore: runStats?.averageScore ?? 0,
            highestRound: answerStats?.highestRound ?? 0,
            totalAnswers: answerStats?.totalAnswers ?? 0,
            correctAnswers: answerStats?.correctAnswers ?? 0,
        };
    }

    static getAdminSummary() {
        const row = getDbClient().all<{
            startedRuns: number;
            playedRuns: number;
            uniquePlayers: number;
            endedPlayedRuns: number;
            openRuns: number;
            cappedRuns: number;
            lostRuns: number;
            exhaustedRuns: number;
            abandonedRuns: number;
            averageScore: number;
            bestScore: number;
            firstPlayedAt: string | null;
            lastRunAt: string | null;
        }>(sql`
            WITH answered_runs AS (
                SELECT run_id
                FROM which_came_first_rounds
                WHERE correct IS NOT NULL
                GROUP BY run_id
            )
            SELECT
                COUNT(runs.id) AS startedRuns,
                COUNT(answered_runs.run_id) AS playedRuns,
                COUNT(DISTINCT CASE WHEN answered_runs.run_id IS NOT NULL THEN runs.user_id END) AS uniquePlayers,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status <> 'active' THEN 1 ELSE 0 END), 0) AS endedPlayedRuns,
                COALESCE(SUM(CASE WHEN runs.status = 'active' THEN 1 ELSE 0 END), 0) AS openRuns,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'won' THEN 1 ELSE 0 END), 0) AS cappedRuns,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'lost' THEN 1 ELSE 0 END), 0) AS lostRuns,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'exhausted' THEN 1 ELSE 0 END), 0) AS exhaustedRuns,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'abandoned' THEN 1 ELSE 0 END), 0) AS abandonedRuns,
                COALESCE(AVG(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status <> 'active' THEN runs.score END), 0) AS averageScore,
                COALESCE(MAX(CASE WHEN answered_runs.run_id IS NOT NULL THEN runs.score ELSE 0 END), 0) AS bestScore,
                MIN(CASE WHEN answered_runs.run_id IS NOT NULL THEN runs.started_at END) AS firstPlayedAt,
                MAX(runs.started_at) AS lastRunAt
            FROM which_came_first_runs runs
            LEFT JOIN answered_runs ON answered_runs.run_id = runs.id
        `).at(0);

        return {
            lastRunAt: row?.lastRunAt ?? null,
            firstPlayedAt: row?.firstPlayedAt ?? null,
            openRuns: Number(row?.openRuns ?? 0),
            lostRuns: Number(row?.lostRuns ?? 0),
            bestScore: Number(row?.bestScore ?? 0),
            cappedRuns: Number(row?.cappedRuns ?? 0),
            playedRuns: Number(row?.playedRuns ?? 0),
            startedRuns: Number(row?.startedRuns ?? 0),
            averageScore: Number(row?.averageScore ?? 0),
            abandonedRuns: Number(row?.abandonedRuns ?? 0),
            exhaustedRuns: Number(row?.exhaustedRuns ?? 0),
            uniquePlayers: Number(row?.uniquePlayers ?? 0),
            endedPlayedRuns: Number(row?.endedPlayedRuns ?? 0),
        };
    }

    static getAdminAnswerSummary() {
        const row = getDbClient().all<{
            totalAnswers: number;
            correctAnswers: number;
        }>(sql`
            SELECT
                COUNT(*) AS totalAnswers,
                COALESCE(SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END), 0) AS correctAnswers
            FROM which_came_first_rounds
            WHERE correct IS NOT NULL
        `).at(0);

        return {
            totalAnswers: Number(row?.totalAnswers ?? 0),
            correctAnswers: Number(row?.correctAnswers ?? 0),
        };
    }

    static getAdminPoolByType() {
        return getDbClient()
            .select({
                count: sql<number>`count(*)`,
                mediaType: whichCameFirstMedia.mediaType,
                oldestReleaseDate: sql<string | null>`min(${whichCameFirstMedia.releaseDate})`,
                newestReleaseDate: sql<string | null>`max(${whichCameFirstMedia.releaseDate})`,
            })
            .from(whichCameFirstMedia)
            .groupBy(whichCameFirstMedia.mediaType)
            .orderBy(desc(sql`count(*)`));
    }

    static getAdminRunsByStatus() {
        return getDbClient().all<{
            count: number;
            status: "active" | "won" | "exhausted" | "lost" | "abandoned";
        }>(sql`
            WITH answered_runs AS (
                SELECT run_id
                FROM which_came_first_rounds
                WHERE correct IS NOT NULL
                GROUP BY run_id
            )
            SELECT runs.status, COUNT(*) AS count
            FROM which_came_first_runs runs
            INNER JOIN answered_runs ON answered_runs.run_id = runs.id
            GROUP BY runs.status
            ORDER BY count DESC
        `).map((row) => ({
            status: row.status,
            count: Number(row.count),
        }));
    }

    static getAdminDailyRuns(days = 30) {
        const normalizedDays = Math.max(1, Math.trunc(days));
        const startModifier = `-${normalizedDays - 1} day`;

        return getDbClient().all<{
            date: string;
            total: number;
            active: number;
            won: number;
            lost: number;
            exhausted: number;
            abandoned: number;
        }>(sql`
            WITH RECURSIVE days(day) AS (
                SELECT date('now', ${startModifier})
                UNION ALL
                SELECT date(day, '+1 day')
                FROM days
                WHERE day < date('now')
            ),
            answered_runs AS (
                SELECT run_id
                FROM which_came_first_rounds
                WHERE correct IS NOT NULL
                GROUP BY run_id
            )
            SELECT
                days.day AS date,
                COUNT(answered_runs.run_id) AS total,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'active' THEN 1 ELSE 0 END), 0) AS active,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'won' THEN 1 ELSE 0 END), 0) AS won,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'lost' THEN 1 ELSE 0 END), 0) AS lost,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'exhausted' THEN 1 ELSE 0 END), 0) AS exhausted,
                COALESCE(SUM(CASE WHEN answered_runs.run_id IS NOT NULL AND runs.status = 'abandoned' THEN 1 ELSE 0 END), 0) AS abandoned
            FROM days
            LEFT JOIN which_came_first_runs runs ON date(runs.started_at) = days.day
            LEFT JOIN answered_runs ON answered_runs.run_id = runs.id
            GROUP BY days.day
            ORDER BY days.day ASC
        `).map((row) => ({
            date: row.date,
            won: Number(row.won),
            lost: Number(row.lost),
            total: Number(row.total),
            active: Number(row.active),
            exhausted: Number(row.exhausted),
            abandoned: Number(row.abandoned),
        }));
    }

    static getAdminScoreDistribution() {
        return getDbClient().all<{
            label: string;
            count: number;
            minScore: number;
            maxScore: number;
        }>(sql`
            WITH buckets(label, min_score, max_score, sort_order) AS (
                VALUES
                    ('0', 0, 0, 1),
                    ('1–3', 1, 3, 2),
                    ('4–7', 4, 7, 3),
                    ('8–12', 8, 12, 4),
                    ('13–20', 13, 20, 5),
                    ('21–29', 21, ${WCF_MAX_ROUNDS - 1}, 6),
                    ('30', ${WCF_MAX_ROUNDS}, ${WCF_MAX_ROUNDS}, 7)
            ),
            answered_runs AS (
                SELECT run_id
                FROM which_came_first_rounds
                WHERE correct IS NOT NULL
                GROUP BY run_id
            ),
            completed_runs AS (
                SELECT runs.score
                FROM which_came_first_runs runs
                INNER JOIN answered_runs ON answered_runs.run_id = runs.id
                WHERE runs.status <> 'active'
            )
            SELECT
                buckets.label AS label,
                buckets.min_score AS minScore,
                buckets.max_score AS maxScore,
                COUNT(completed_runs.score) AS count
            FROM buckets
            LEFT JOIN completed_runs
                ON completed_runs.score BETWEEN buckets.min_score AND buckets.max_score
            GROUP BY buckets.label, buckets.min_score, buckets.max_score, buckets.sort_order
            ORDER BY buckets.sort_order ASC
        `).map((row) => ({
            label: row.label,
            count: Number(row.count),
            minScore: Number(row.minScore),
            maxScore: Number(row.maxScore),
        }));
    }

    static getAdminMediaTypeUsage() {
        return getDbClient().all<{
            mediaType: MediaType;
            selectedCount: number;
            roundAppearances: number;
        }>(sql`
            WITH selected AS (
                SELECT json_each.value AS media_type, COUNT(*) AS selected_count
                FROM which_came_first_runs, json_each(which_came_first_runs.selected_media_types)
                GROUP BY json_each.value
            ),
            appearances AS (
                SELECT media_type, COUNT(*) AS round_appearances
                FROM (
                    SELECT left_media_type AS media_type FROM which_came_first_rounds
                    UNION ALL
                    SELECT right_media_type AS media_type FROM which_came_first_rounds
                )
                GROUP BY media_type
            ),
            keys AS (
                SELECT media_type FROM selected
                UNION
                SELECT media_type FROM appearances
            )
            SELECT
                keys.media_type AS mediaType,
                COALESCE(selected.selected_count, 0) AS selectedCount,
                COALESCE(appearances.round_appearances, 0) AS roundAppearances
            FROM keys
            LEFT JOIN selected ON selected.media_type = keys.media_type
            LEFT JOIN appearances ON appearances.media_type = keys.media_type
            ORDER BY roundAppearances DESC, selectedCount DESC
        `).map((row) => ({
            mediaType: row.mediaType,
            selectedCount: Number(row.selectedCount),
            roundAppearances: Number(row.roundAppearances),
        }));
    }

    static getAdminRoundAccuracy() {
        return getDbClient().all<{
            roundNumber: number;
            totalAnswers: number;
            correctAnswers: number;
            accuracy: number;
        }>(sql`
            SELECT
                round_number AS roundNumber,
                COUNT(*) AS totalAnswers,
                COALESCE(SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END), 0) AS correctAnswers,
                COALESCE(ROUND((SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 1), 0) AS accuracy
            FROM which_came_first_rounds
            WHERE correct IS NOT NULL
            GROUP BY round_number
            ORDER BY round_number ASC
        `).map((row) => ({
            roundNumber: Number(row.roundNumber),
            totalAnswers: Number(row.totalAnswers),
            correctAnswers: Number(row.correctAnswers),
            accuracy: Number(row.accuracy),
        }));
    }

    static getAdminTopPlayers(limit = 8) {
        return getDbClient().all<{
            userId: number;
            name: string;
            email: string;
            image: string | null;
            runsPlayed: number;
            activeRuns: number;
            wins: number;
            bestScore: number;
            averageScore: number;
            totalAnswers: number;
            correctAnswers: number;
        }>(sql`
            WITH answered_runs AS (
                SELECT run_id
                FROM which_came_first_rounds
                WHERE correct IS NOT NULL
                GROUP BY run_id
            ),
            answered_run_scores AS (
                SELECT
                    runs.user_id,
                    runs.id,
                    runs.status,
                    runs.score
                FROM which_came_first_runs runs
                INNER JOIN answered_runs ON answered_runs.run_id = runs.id
            ),
            run_stats AS (
                SELECT
                    user_id,
                    COUNT(*) AS runs_played,
                    COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_runs,
                    COALESCE(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END), 0) AS wins,
                    COALESCE(MAX(score), 0) AS best_score,
                    COALESCE(AVG(CASE WHEN status <> 'active' THEN score END), 0) AS average_score
                FROM answered_run_scores
                GROUP BY user_id
            ),
            answer_stats AS (
                SELECT
                    runs.user_id,
                    COUNT(rounds.id) AS total_answers,
                    COALESCE(SUM(CASE WHEN rounds.correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers
                FROM which_came_first_rounds rounds
                INNER JOIN which_came_first_runs runs ON runs.id = rounds.run_id
                WHERE rounds.correct IS NOT NULL
                GROUP BY runs.user_id
            )
            SELECT
                u.id AS userId,
                u.name AS name,
                u.email AS email,
                u.image AS image,
                run_stats.runs_played AS runsPlayed,
                run_stats.active_runs AS activeRuns,
                run_stats.wins AS wins,
                run_stats.best_score AS bestScore,
                run_stats.average_score AS averageScore,
                COALESCE(answer_stats.total_answers, 0) AS totalAnswers,
                COALESCE(answer_stats.correct_answers, 0) AS correctAnswers
            FROM run_stats
            INNER JOIN "user" u ON u.id = run_stats.user_id
            LEFT JOIN answer_stats ON answer_stats.user_id = run_stats.user_id
            ORDER BY
                run_stats.best_score DESC,
                run_stats.wins DESC,
                run_stats.average_score DESC,
                run_stats.runs_played DESC,
                u.name ASC
            LIMIT ${limit}
        `).map((row) => ({
            userId: Number(row.userId),
            name: row.name,
            email: row.email,
            image: row.image ? getImageUrl("profile-covers", row.image) : null,
            runsPlayed: Number(row.runsPlayed),
            activeRuns: Number(row.activeRuns),
            wins: Number(row.wins),
            bestScore: Number(row.bestScore),
            averageScore: Number(row.averageScore),
            totalAnswers: Number(row.totalAnswers),
            correctAnswers: Number(row.correctAnswers),
        }));
    }

    static getAdminRecentRuns(limit = 12) {
        return getDbClient()
            .select({
                id: whichCameFirstRuns.id,
                userId: user.id,
                name: user.name,
                image: user.image,
                role: user.role,
                score: whichCameFirstRuns.score,
                status: whichCameFirstRuns.status,
                startedAt: whichCameFirstRuns.startedAt,
                completedAt: whichCameFirstRuns.completedAt,
                selectedMediaTypes: whichCameFirstRuns.selectedMediaTypes,
            })
            .from(whichCameFirstRuns)
            .innerJoin(user, eq(user.id, whichCameFirstRuns.userId))
            .orderBy(desc(whichCameFirstRuns.startedAt))
            .limit(limit);
    }

    static async deletePoolMedia(mediaType: MediaType, mediaIds: number[]) {
        await getDbClient()
            .delete(whichCameFirstMedia)
            .where(and(
                eq(whichCameFirstMedia.mediaType, mediaType),
                inArray(whichCameFirstMedia.mediaId, mediaIds),
            ));
    }
}


const recentMediaFilter = (alias: "first_candidate" | "second_candidate") => {
    const candidate = sql.raw(alias);
    return sql`
        AND NOT EXISTS (
            SELECT 1
            FROM recent
            WHERE (
                recent.left_media_type = ${candidate}.media_type
                AND recent.left_media_id = ${candidate}.media_id
            ) OR (
                recent.right_media_type = ${candidate}.media_type
                AND recent.right_media_id = ${candidate}.media_id
            )
        )
    `;
};
