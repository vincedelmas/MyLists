import {MediaType} from "@/lib/utils/enums";
import {WCF_MAX_ROUNDS} from "@/lib/schemas/wcf.schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, desc, eq, gt, inArray, isNull, or, sql} from "drizzle-orm";
import {whichCameFirstMedia, whichCameFirstRounds, whichCameFirstRuns} from "@/lib/server/database/schema";


type WcfPair = {
    leftMediaId: number;
    rightMediaId: number;
    leftReleaseDate: string;
    leftMediaType: MediaType;
    rightReleaseDate: string;
    rightMediaType: MediaType;
};


export class WcfRepository {
    static syncCuratedPool(mediaType: MediaType, mediaRefs: { id: number; releaseDate: string }[]) {
        getDbClient()
            .delete(whichCameFirstMedia)
            .where(eq(whichCameFirstMedia.mediaType, mediaType)).run();

        if (mediaRefs.length === 0) return;

        getDbClient()
            .insert(whichCameFirstMedia)
            .values(mediaRefs.map((media) => ({
                mediaType,
                mediaId: media.id,
                releaseDate: media.releaseDate,
            }))).run();
    }

    static countPool(mediaTypes?: MediaType[]) {
        return getDbClient()
            .select({
                count: sql<number>`count(*)`,
                mediaType: whichCameFirstMedia.mediaType,
            })
            .from(whichCameFirstMedia)
            .where(mediaTypes?.length ? inArray(whichCameFirstMedia.mediaType, mediaTypes) : undefined)
            .groupBy(whichCameFirstMedia.mediaType).all();
    }

    static findPair(runId: number, leftType: MediaType, rightType: MediaType, minDays: number, maxDays: number | null, excludeRecent: boolean) {
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

    static createRun(userId: number, mediaTypes: MediaType[]) {
        getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "abandoned", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(whichCameFirstRuns.userId, userId), eq(whichCameFirstRuns.status, "active"))).run();

        const [run] = getDbClient()
            .insert(whichCameFirstRuns)
            .values({ userId, selectedMediaTypes: mediaTypes })
            .returning().all();

        return run;
    }

    static getActiveRound(runId: number) {
        return getDbClient()
            .select()
            .from(whichCameFirstRounds)
            .where(and(eq(whichCameFirstRounds.runId, runId), isNull(whichCameFirstRounds.answeredAt)))
            .get();
    }

    static createRound(data: typeof whichCameFirstRounds.$inferInsert) {
        const [round] = getDbClient()
            .insert(whichCameFirstRounds)
            .values(data)
            .returning().all();

        return round;
    }

    static deleteOpenRound(roundId: number) {
        getDbClient()
            .delete(whichCameFirstRounds)
            .where(and(eq(whichCameFirstRounds.id, roundId), isNull(whichCameFirstRounds.answeredAt))).run();
    }

    static answerRound(userId: number, runId: number, roundId: number, selectedSide: "left" | "right") {
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
        const [updatedRound] = getDbClient()
            .update(whichCameFirstRounds)
            .set({ selectedSide, correct, answeredAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(whichCameFirstRounds.id, roundId), isNull(whichCameFirstRounds.answeredAt)))
            .returning().all();
        if (!updatedRound) throw new FormattedError("This round has already been answered.");

        const [updatedRun] = getDbClient()
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
            .returning().all();

        return {
            correct,
            correctSide,
            run: updatedRun,
            round: updatedRound,
        };
    }

    static abandonRun(userId: number, runId: number) {
        getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "abandoned", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(
                eq(whichCameFirstRuns.id, runId),
                eq(whichCameFirstRuns.userId, userId),
                eq(whichCameFirstRuns.status, "active"),
            )).run();
    }

    static exhaustRun(runId: number) {
        getDbClient()
            .update(whichCameFirstRuns)
            .set({ status: "exhausted", completedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(
                eq(whichCameFirstRuns.id, runId),
                eq(whichCameFirstRuns.status, "active"),
            )).run();
    }

    static deleteUserRuns(userId: number) {
        getDbClient()
            .delete(whichCameFirstRuns)
            .where(eq(whichCameFirstRuns.userId, userId)).run();
    }

    static getStats(userId: number) {
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

    static getLeaderboard(currentUserId: number) {
        const rows = getDbClient().all<{
            rank: number;
            name: string;
            userId: number;
            bestScore: number;
            runsPlayed: number;
            perfectRuns: number;
            image: string | null;
            averageScore: number;
            totalAnswers: number;
            correctAnswers: number;
        }>(sql`
            WITH completed_runs AS (
                SELECT runs.*
                FROM which_came_first_runs runs
                WHERE (
                    runs.status IN ('won', 'lost', 'exhausted')
                    OR (runs.status = 'abandoned' AND runs.score > 0)
                )
                AND EXISTS (
                    SELECT 1
                    FROM which_came_first_rounds rounds
                    WHERE rounds.run_id = runs.id
                        AND rounds.correct IS NOT NULL
                )
            ),
            run_stats AS (
                SELECT
                    user_id,
                    COUNT(*) AS runs_played,
                    COALESCE(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END), 0) AS perfect_runs,
                    COALESCE(MAX(score), 0) AS best_score,
                    COALESCE(AVG(score), 0) AS average_score
                FROM completed_runs
                GROUP BY user_id
            ),
            answer_stats AS (
                SELECT
                    runs.user_id,
                    COUNT(rounds.id) AS total_answers,
                    COALESCE(SUM(CASE WHEN rounds.correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers
                FROM completed_runs runs
                INNER JOIN which_came_first_rounds rounds ON rounds.run_id = runs.id
                WHERE rounds.correct IS NOT NULL
                GROUP BY runs.user_id
            ),
            ranked_players AS (
                SELECT
                    ROW_NUMBER() OVER (
                        ORDER BY
                            run_stats.best_score DESC,
                            run_stats.perfect_runs DESC,
                            run_stats.average_score DESC,
                            run_stats.runs_played DESC,
                            u.name ASC,
                            u.id ASC
                    ) AS rank,
                    u.id AS userId,
                    u.name AS name,
                    u.image AS image,
                    run_stats.runs_played AS runsPlayed,
                    run_stats.perfect_runs AS perfectRuns,
                    run_stats.best_score AS bestScore,
                    run_stats.average_score AS averageScore,
                    answer_stats.total_answers AS totalAnswers,
                    answer_stats.correct_answers AS correctAnswers
                FROM run_stats
                INNER JOIN "user" u ON u.id = run_stats.user_id
                INNER JOIN answer_stats ON answer_stats.user_id = run_stats.user_id
            )
            SELECT *
            FROM ranked_players
            WHERE rank <= 10 OR userId = ${currentUserId}
            ORDER BY rank ASC
        `).map((row) => ({
            name: row.name,
            rank: Number(row.rank),
            userId: Number(row.userId),
            bestScore: Number(row.bestScore),
            runsPlayed: Number(row.runsPlayed),
            perfectRuns: Number(row.perfectRuns),
            averageScore: Number(row.averageScore),
            image: row.image ? getImageUrl("profile-covers", row.image) : null,
            accuracy: Number(row.totalAnswers) > 0 ? (Number(row.correctAnswers) / Number(row.totalAnswers)) * 100 : 0,
        }));

        return {
            entries: rows.filter((entry) => entry.rank <= 10),
            currentUserEntry: rows.find((entry) => entry.userId === currentUserId) ?? null,
        };
    }

    static deletePoolMedia(mediaType: MediaType, mediaIds: number[]) {
        getDbClient()
            .delete(whichCameFirstMedia)
            .where(and(
                eq(whichCameFirstMedia.mediaType, mediaType),
                inArray(whichCameFirstMedia.mediaId, mediaIds),
            )).run();
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
