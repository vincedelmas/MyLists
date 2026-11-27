import {and, asc, count, countDistinct, desc, eq, inArray, max, or, sql, sum} from "drizzle-orm";
import {AchievementCategory, PrivacyType, SocialState, Status, UpdateType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    collections,
    dailyMediadle,
    dynamicLists,
    featureRequests,
    featureVotes,
    followers,
    mediadleStats,
    mediaTags,
    movies,
    userMediaMonthlyActivity,
    userMediadleProgress,
    userMediaSettings,
    whichCameFirstRuns,
} from "@/lib/server/database/schema";
import {summarizeLabeledRows} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, AchievementCatalog, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


const ACTIVE_MEDIA_UNION = sql`
    SELECT raw.*
    FROM (
        SELECT l.user_id, 'movies' AS media_type, l.media_id, m.name AS title, m.release_date AS release_date,
               l.status, l.rating, l.favorite, l.redo, l.comment, l.added_at, l.last_updated
        FROM movies_list l INNER JOIN movies m ON m.id = l.media_id
        UNION ALL
        SELECT l.user_id, 'series' AS media_type, l.media_id, m.name AS title, m.release_date AS release_date,
               l.status, l.rating, l.favorite, l.redo, l.comment, l.added_at, l.last_updated
        FROM series_list l INNER JOIN series m ON m.id = l.media_id
        UNION ALL
        SELECT l.user_id, 'anime' AS media_type, l.media_id, m.name AS title, m.release_date AS release_date,
               l.status, l.rating, l.favorite, l.redo, l.comment, l.added_at, l.last_updated
        FROM anime_list l INNER JOIN anime m ON m.id = l.media_id
        UNION ALL
        SELECT l.user_id, 'games' AS media_type, l.media_id, m.name AS title, m.release_date AS release_date,
               l.status, l.rating, l.favorite, 0 AS redo, l.comment, l.added_at, l.last_updated
        FROM games_list l INNER JOIN games m ON m.id = l.media_id
        UNION ALL
        SELECT l.user_id, 'books' AS media_type, l.media_id, COALESCE(l.custom_title, m.name) AS title,
               COALESCE(l.custom_release_date, m.release_date) AS release_date,
               l.status, l.rating, l.favorite, l.redo, l.comment, l.added_at, l.last_updated
        FROM books_list l INNER JOIN books m ON m.id = l.media_id
        UNION ALL
        SELECT l.user_id, 'manga' AS media_type, l.media_id, m.name AS title, m.release_date AS release_date,
               l.status, l.rating, l.favorite, l.redo, l.comment, l.added_at, l.last_updated
        FROM manga_list l INNER JOIN manga m ON m.id = l.media_id
    ) AS raw
    INNER JOIN user_media_settings ums
        ON ums.user_id = raw.user_id
       AND ums.media_type = raw.media_type
       AND ums.active = 1
`;


export function createAppAchievementCatalogs(): AchievementCatalog[] {
    // --- General / Cross-Media ------------------------------------------------

    const polymath: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaSettings.userId,
                value: count(userMediaSettings.mediaType),
            })
            .from(userMediaSettings)
            .where(and(
                eq(userMediaSettings.active, true),
                sql`CAST(COALESCE(json_extract(${userMediaSettings.statusCounts}, '$.Completed'), 0) AS INTEGER) >= 1`,
                userId !== undefined ? eq(userMediaSettings.userId, userId) : undefined,
            ))
            .groupBy(userMediaSettings.userId)
            .all();
    };

    const totalCompleted: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaSettings.userId,
                value: sql<number>`COALESCE(SUM(CAST(COALESCE(json_extract(${userMediaSettings.statusCounts}, '$.Completed'), 0) AS INTEGER)), 0)`,
            })
            .from(userMediaSettings)
            .where(and(
                eq(userMediaSettings.active, true),
                userId !== undefined ? eq(userMediaSettings.userId, userId) : undefined,
            ))
            .groupBy(userMediaSettings.userId)
            .all();
    };

    const totalFavorites: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaSettings.userId,
                value: sql<number>`COALESCE(SUM(${userMediaSettings.entriesFavorites}), 0)`,
            })
            .from(userMediaSettings)
            .where(and(
                eq(userMediaSettings.active, true),
                userId !== undefined ? eq(userMediaSettings.userId, userId) : undefined,
            ))
            .groupBy(userMediaSettings.userId)
            .all();
    };

    const totalRedo: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaSettings.userId,
                value: sql<number>`COALESCE(SUM(${userMediaSettings.totalRedo}), 0)`,
            })
            .from(userMediaSettings)
            .where(and(
                eq(userMediaSettings.active, true),
                userId !== undefined ? eq(userMediaSettings.userId, userId) : undefined,
            ))
            .groupBy(userMediaSettings.userId)
            .all();
    };

    const totalHours: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaSettings.userId,
                value: sql<number>`COALESCE(SUM(${userMediaSettings.timeSpent}), 0) / 60.0`,
            })
            .from(userMediaSettings)
            .where(and(
                eq(userMediaSettings.active, true),
                userId !== undefined ? eq(userMediaSettings.userId, userId) : undefined,
            ))
            .groupBy(userMediaSettings.userId)
            .all();
    };

    const activeMonths: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: userMediaMonthlyActivity.userId,
                value: countDistinct(userMediaMonthlyActivity.monthBucket),
            })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(
                eq(userMediaMonthlyActivity.hidden, false),
                or(
                    sql`${userMediaMonthlyActivity.progressGained} > 0`,
                    sql`${userMediaMonthlyActivity.redoGained} > 0`,
                    eq(userMediaMonthlyActivity.hadCompletion, true),
                ),
                userId !== undefined ? eq(userMediaMonthlyActivity.userId, userId) : undefined,
            ))
            .groupBy(userMediaMonthlyActivity.userId)
            .all();
    };

    const fullHouseMonth: AchievementCalculation = (userId) => {
        const monthlyDistinct = getDbClient()
            .select({
                userId: userMediaMonthlyActivity.userId,
                monthBucket: userMediaMonthlyActivity.monthBucket,
                mediaCount: countDistinct(userMediaMonthlyActivity.mediaType).as("media_count"),
            })
            .from(userMediaMonthlyActivity)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userMediaMonthlyActivity.userId),
                eq(userMediaSettings.mediaType, userMediaMonthlyActivity.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(and(
                eq(userMediaMonthlyActivity.hidden, false),
                eq(userMediaMonthlyActivity.hadCompletion, true),
                userId !== undefined ? eq(userMediaMonthlyActivity.userId, userId) : undefined,
            ))
            .groupBy(userMediaMonthlyActivity.userId, userMediaMonthlyActivity.monthBucket)
            .as("monthly_distinct");

        return getDbClient()
            .select({
                userId: monthlyDistinct.userId,
                value: sql<number>`COALESCE(MAX(${monthlyDistinct.mediaCount}), 0)`,
            })
            .from(monthlyDistinct)
            .groupBy(monthlyDistinct.userId)
            .all();
    };

    const decadeHopper: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        return getDbClient().all<{ userId: number; value: number }>(sql`
            SELECT
                all_media.user_id AS userId,
                COUNT(DISTINCT (CAST(substr(all_media.release_date, 1, 4) AS INTEGER) / 10)) AS value
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            WHERE all_media.status = ${Status.COMPLETED}
              AND all_media.release_date IS NOT NULL
              AND substr(all_media.release_date, 1, 4) GLOB '[12][0-9][0-9][0-9]'
              ${userClause}
            GROUP BY all_media.user_id
        `);
    };

    const generalCatalog = defineAchievementCatalog({
        category: AchievementCategory.GENERAL,
        mediaType: null,
        entries: {
            general_polymath_3: {
                name: "Media Polymath",
                description: "Complete at least 1 title across 3 different media types.",
                icon: "compass",
                shape: "circle",
                pattern: "rings",
                target: 3,
                calculate: polymath,
            },
            general_completed_100: {
                name: "Century Club",
                description: "Complete 100 titles across all your active lists.",
                icon: "laurel-crown",
                shape: "shield",
                pattern: "rays",
                target: 100,
                calculate: totalCompleted,
            },
            general_favorites_15: {
                name: "Hall of Favorites",
                description: "Mark 15 titles as favorites across your lists.",
                icon: "hearts",
                shape: "circle",
                pattern: "dots",
                target: 15,
                calculate: totalFavorites,
            },
            general_redo_10: {
                name: "Comfort Rewatch",
                description: "Log 10 total rewatches, replays, or rereads. Some stories never get old.",
                icon: "cycle",
                shape: "hex",
                pattern: "rings",
                target: 10,
                calculate: totalRedo,
            },
            general_decades_6: {
                name: "Decade Hopper",
                description: "Complete titles released across 6 different decades.",
                icon: "calendar",
                shape: "hex",
                pattern: "rays",
                target: 6,
                calculate: decadeHopper,
            },
            general_active_months_6: {
                name: "Steady Habit",
                description: "Stay active tracking media across 6 distinct months.",
                icon: "flame",
                shape: "octagon",
                pattern: "rings",
                target: 6,
                calculate: activeMonths,
            },
            general_time_1000: {
                name: "A Thousand Hours",
                description: "Track 1,000 total hours of movies, shows, games, books, anime, and manga.",
                icon: "medal",
                shape: "shield",
                pattern: "rays",
                target: 1000,
                calculate: totalHours,
            },
            general_full_house: {
                name: "Full House Month",
                description: "Complete titles across 3 or more media types in a single month.",
                icon: "card-random",
                shape: "octagon",
                pattern: "dots",
                target: 3,
                calculate: fullHouseMonth,
            },
        },
    });

    // --- Minigames (Moviedle + Which Came First) ------------------------------

    const moviedleWins: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: mediadleStats.userId,
                value: sql<number>`COALESCE(SUM(${mediadleStats.totalWon}), 0)`,
            })
            .from(mediadleStats)
            .where(userId !== undefined ? eq(mediadleStats.userId, userId) : undefined)
            .groupBy(mediadleStats.userId)
            .all();
    };

    const moviedleBestStreak: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: mediadleStats.userId,
                value: sql<number>`COALESCE(MAX(${mediadleStats.bestStreak}), 0)`,
            })
            .from(mediadleStats)
            .where(userId !== undefined ? eq(mediadleStats.userId, userId) : undefined)
            .groupBy(mediadleStats.userId)
            .all();
    };

    const moviedleSniper: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: userMediadleProgress.userId,
                label: movies.name,
            })
            .from(userMediadleProgress)
            .innerJoin(dailyMediadle, eq(userMediadleProgress.dailyMediadleId, dailyMediadle.id))
            .innerJoin(movies, eq(dailyMediadle.mediaId, movies.id))
            .where(and(
                eq(userMediadleProgress.succeeded, true),
                eq(userMediadleProgress.attempts, 1),
                userId !== undefined ? eq(userMediadleProgress.userId, userId) : undefined,
            ))
            .orderBy(desc(userMediadleProgress.completionTime), asc(userMediadleProgress.id))
            .all();

        return summarizeLabeledRows(rows);
    };

    const wcfMaxScore: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: whichCameFirstRuns.userId,
                value: sql<number>`COALESCE(${max(whichCameFirstRuns.score)}, 0)`,
            })
            .from(whichCameFirstRuns)
            .where(userId !== undefined ? eq(whichCameFirstRuns.userId, userId) : undefined)
            .groupBy(whichCameFirstRuns.userId)
            .all();
    };

    const wcfWon: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: whichCameFirstRuns.userId,
                value: count(whichCameFirstRuns.id),
            })
            .from(whichCameFirstRuns)
            .where(and(
                eq(whichCameFirstRuns.status, "won"),
                userId !== undefined ? eq(whichCameFirstRuns.userId, userId) : undefined,
            ))
            .groupBy(whichCameFirstRuns.userId)
            .all();
    };

    const wcfCompletedRuns: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: whichCameFirstRuns.userId,
                value: count(whichCameFirstRuns.id),
            })
            .from(whichCameFirstRuns)
            .where(and(
                inArray(whichCameFirstRuns.status, ["won", "lost", "exhausted"]),
                userId !== undefined ? eq(whichCameFirstRuns.userId, userId) : undefined,
            ))
            .groupBy(whichCameFirstRuns.userId)
            .all();
    };

    const minigamesCatalog = defineAchievementCatalog({
        category: AchievementCategory.MINIGAMES,
        mediaType: null,
        entries: {
            minigames_moviedle_first: {
                name: "Pixel Detective",
                description: "Win your first daily Moviedle.",
                icon: "magnifying-glass",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: moviedleWins,
            },
            minigames_moviedle_sniper: {
                name: "20/20 Pixel Vision",
                description: "Solve a daily Moviedle on your very first guess.",
                icon: "eye-target",
                shape: "shield",
                pattern: "rays",
                target: 1,
                calculate: moviedleSniper,
            },
            minigames_moviedle_streak_7: {
                name: "Weekly Cine-Streak",
                description: "Reach a 7-day winning streak in Moviedle.",
                icon: "flame",
                shape: "octagon",
                pattern: "rays",
                target: 7,
                calculate: moviedleBestStreak,
            },
            minigames_moviedle_wins_30: {
                name: "Moviedle Veteran",
                description: "Win 30 daily Moviedle puzzles.",
                icon: "bullseye",
                shape: "shield",
                pattern: "rings",
                target: 30,
                calculate: moviedleWins,
            },
            minigames_wcf_score_10: {
                name: "Chronology Buff",
                description: "Reach a streak of 10 in a Which Came First run.",
                icon: "alarm-clock",
                shape: "hex",
                pattern: "rings",
                target: 10,
                calculate: wcfMaxScore,
            },
            minigames_wcf_score_20: {
                name: "Timeline Master",
                description: "Reach a streak of 20 in a Which Came First run.",
                icon: "clockwork",
                shape: "octagon",
                pattern: "rays",
                target: 20,
                calculate: wcfMaxScore,
            },
            minigames_wcf_won: {
                name: "Master of Time",
                description: "Win a complete 30-round run of Which Came First.",
                icon: "laurel-crown",
                shape: "shield",
                pattern: "rays",
                target: 1,
                calculate: wcfWon,
            },
            minigames_wcf_runs_10: {
                name: "History Repeats Itself",
                description: "Finish 10 runs of Which Came First.",
                icon: "cycle",
                shape: "circle",
                pattern: "dots",
                target: 10,
                calculate: wcfCompletedRuns,
            },
        },
    });

    // --- Community & Curation -------------------------------------------------

    const collectionCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: collections.ownerId, value: count(collections.id) })
            .from(collections)
            .where(userId !== undefined ? eq(collections.ownerId, userId) : undefined)
            .groupBy(collections.ownerId)
            .all();
    };

    const publicCollectionCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: collections.ownerId, value: count(collections.id) })
            .from(collections)
            .where(and(
                eq(collections.privacy, PrivacyType.PUBLIC),
                userId !== undefined ? eq(collections.ownerId, userId) : undefined,
            ))
            .groupBy(collections.ownerId)
            .all();
    };

    const collectionLikesReceived: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: collections.ownerId,
                value: sql<number>`COALESCE(${sum(collections.likeCount)}, 0)`,
            })
            .from(collections)
            .where(userId !== undefined ? eq(collections.ownerId, userId) : undefined)
            .groupBy(collections.ownerId)
            .all();
    };

    const dynamicListCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: dynamicLists.userId, value: count(dynamicLists.id) })
            .from(dynamicLists)
            .where(userId !== undefined ? eq(dynamicLists.userId, userId) : undefined)
            .groupBy(dynamicLists.userId)
            .all();
    };

    const tagCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: mediaTags.userId, value: countDistinct(mediaTags.name) })
            .from(mediaTags)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, mediaTags.userId),
                eq(userMediaSettings.mediaType, mediaTags.mediaType),
                eq(userMediaSettings.active, true),
            ))
            .where(userId !== undefined ? eq(mediaTags.userId, userId) : undefined)
            .groupBy(mediaTags.userId)
            .all();
    };

    const followCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: followers.followerId, value: count(followers.followedId) })
            .from(followers)
            .where(and(
                eq(followers.status, SocialState.ACCEPTED),
                userId !== undefined ? eq(followers.followerId, userId) : undefined,
            ))
            .groupBy(followers.followerId)
            .all();
    };

    const featureEngagement: AchievementCalculation = (userId) => {
        const userFilterVotes = userId !== undefined ? sql`WHERE user_id = ${userId}` : sql``;
        const userFilterReqs = userId !== undefined
            ? sql`WHERE created_by = ${userId}`
            : sql`WHERE created_by IS NOT NULL`;

        return getDbClient().all<{ userId: number; value: number }>(sql`
            SELECT user_id AS userId, COUNT(*) AS value
            FROM (
                SELECT user_id FROM ${featureVotes} ${userFilterVotes}
                UNION ALL
                SELECT created_by AS user_id FROM ${featureRequests} ${userFilterReqs}
            )
            GROUP BY user_id
        `);
    };

    const communityCatalog = defineAchievementCatalog({
        category: AchievementCategory.COMMUNITY,
        mediaType: null,
        entries: {
            community_collection_first: {
                name: "Curator in the Making",
                description: "Create your first custom collection.",
                icon: "bookmark",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: collectionCount,
            },
            community_collection_public: {
                name: "Open Gallery",
                description: "Publish a public collection for the MyLists community to discover.",
                icon: "archive",
                shape: "hex",
                pattern: "rays",
                target: 1,
                calculate: publicCollectionCount,
            },
            community_collection_liked: {
                name: "Crowd Pleaser",
                description: "Receive 5 total likes across your collections.",
                icon: "hearts",
                shape: "octagon",
                pattern: "rays",
                target: 5,
                calculate: collectionLikesReceived,
            },
            community_dynamic_list: {
                name: "Spreadsheet Brain",
                description: "Create your first dynamic list with custom filters.",
                icon: "funnel",
                shape: "hex",
                pattern: "dots",
                target: 1,
                calculate: dynamicListCount,
            },
            community_tags_10: {
                name: "Label Maker",
                description: "Create 10 distinct custom tags to organize your lists.",
                icon: "tag",
                shape: "circle",
                pattern: "dots",
                target: 10,
                calculate: tagCount,
            },
            community_follow_first: {
                name: "Social Butterfly",
                description: "Follow another MyLists member to keep up with their tracking feed.",
                icon: "team",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: followCount,
            },
            community_feature_vote: {
                name: "Backseat Product Manager",
                description: "Vote on or submit a feature request for MyLists.",
                icon: "vote",
                shape: "hex",
                pattern: "rings",
                target: 1,
                calculate: featureEngagement,
            },
        },
    });

    // --- Secrets & Easter Eggs ------------------------------------------------

    const wcfRoundOneLoss: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: whichCameFirstRuns.userId, value: count(whichCameFirstRuns.id) })
            .from(whichCameFirstRuns)
            .where(and(
                eq(whichCameFirstRuns.status, "lost"),
                eq(whichCameFirstRuns.score, 0),
                userId !== undefined ? eq(whichCameFirstRuns.userId, userId) : undefined,
            ))
            .groupBy(whichCameFirstRuns.userId)
            .all();
    };

    const harshCritic: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT all_media.user_id AS userId, all_media.title AS label
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            WHERE all_media.rating IS NOT NULL
              AND all_media.rating <= 2
              AND all_media.comment IS NOT NULL
              AND trim(all_media.comment) <> ''
              ${userClause}
            ORDER BY COALESCE(all_media.last_updated, all_media.added_at) DESC, all_media.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const backlogSlayer: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT all_media.user_id AS userId, all_media.title AS label
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            INNER JOIN user_media_update u
                ON u.user_id = all_media.user_id
               AND u.media_type = all_media.media_type
               AND u.media_id = all_media.media_id
            WHERE all_media.status = ${Status.COMPLETED}
              AND all_media.added_at IS NOT NULL
              AND u.update_type = ${UpdateType.STATUS}
              AND json_extract(u.payload, '$.new_value') = ${Status.COMPLETED}
              AND json_extract(u.payload, '$.old_value') IS NOT NULL
              AND json_extract(u.payload, '$.old_value') <> ${Status.COMPLETED}
              AND (julianday(u.timestamp) - julianday(all_media.added_at)) >= 365
              ${userClause}
            ORDER BY u.timestamp DESC, all_media.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const superfan: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT all_media.user_id AS userId, all_media.title AS label
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            WHERE all_media.redo >= 3
              ${userClause}
            ORDER BY all_media.redo DESC, COALESCE(all_media.last_updated, all_media.added_at) DESC, all_media.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const loveLetter: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT all_media.user_id AS userId, all_media.title AS label
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            WHERE all_media.rating = 10
              AND all_media.favorite = 1
              AND all_media.comment IS NOT NULL
              AND trim(all_media.comment) <> ''
              ${userClause}
            ORDER BY COALESCE(all_media.last_updated, all_media.added_at) DESC, all_media.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const dayOne: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT all_media.user_id AS userId, all_media.title AS label
            FROM (${ACTIVE_MEDIA_UNION}) AS all_media
            INNER JOIN user_media_update u
                ON u.user_id = all_media.user_id
               AND u.media_type = all_media.media_type
               AND u.media_id = all_media.media_id
            WHERE all_media.status = ${Status.COMPLETED}
              AND u.update_type = ${UpdateType.STATUS}
              AND json_extract(u.payload, '$.new_value') = ${Status.COMPLETED}
              AND all_media.release_date IS NOT NULL
              AND substr(all_media.release_date, 1, 10) GLOB '[12][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'
              AND (julianday(substr(u.timestamp, 1, 10)) - julianday(substr(all_media.release_date, 1, 10))) BETWEEN 0 AND 3
              ${userClause}
            ORDER BY u.timestamp DESC, all_media.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const sunkCost: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND dropped.user_id = ${userId}` : sql``;
        const rows = getDbClient().all<{ userId: number; label: string | null }>(sql`
            SELECT dropped.user_id AS userId, dropped.title AS label
            FROM (
                SELECT l.user_id, 'series' AS media_type, m.name AS title, l.added_at, l.last_updated
                FROM series_list l INNER JOIN series m ON m.id = l.media_id
                WHERE l.status = ${Status.DROPPED}
                  AND m.total_episodes >= 4
                  AND l.total >= m.total_episodes * 0.75
                  AND l.total < m.total_episodes
                UNION ALL
                SELECT l.user_id, 'anime' AS media_type, m.name AS title, l.added_at, l.last_updated
                FROM anime_list l INNER JOIN anime m ON m.id = l.media_id
                WHERE l.status = ${Status.DROPPED}
                  AND m.total_episodes >= 4
                  AND l.total >= m.total_episodes * 0.75
                  AND l.total < m.total_episodes
                UNION ALL
                SELECT l.user_id, 'books' AS media_type, COALESCE(l.custom_title, m.name) AS title, l.added_at, l.last_updated
                FROM books_list l INNER JOIN books m ON m.id = l.media_id
                WHERE l.status = ${Status.DROPPED}
                  AND l.custom_pages >= 50
                  AND l.actual_page IS NOT NULL
                  AND l.actual_page >= l.custom_pages * 0.75
                  AND l.actual_page < l.custom_pages
                UNION ALL
                SELECT l.user_id, 'manga' AS media_type, m.name AS title, l.added_at, l.last_updated
                FROM manga_list l INNER JOIN manga m ON m.id = l.media_id
                WHERE l.status = ${Status.DROPPED}
                  AND m.chapters IS NOT NULL
                  AND m.chapters >= 10
                  AND l.current_chapter >= m.chapters * 0.75
                  AND l.current_chapter < m.chapters
            ) AS dropped
            INNER JOIN user_media_settings ums
                ON ums.user_id = dropped.user_id
               AND ums.media_type = dropped.media_type
               AND ums.active = 1
            WHERE 1 = 1
              ${userClause}
            ORDER BY COALESCE(dropped.last_updated, dropped.added_at) DESC, dropped.title ASC
        `);

        return summarizeLabeledRows(rows);
    };

    const secretsCatalog = defineAchievementCatalog({
        category: AchievementCategory.SECRETS,
        mediaType: null,
        entries: {
            secret_privacy_policy: {
                name: "Wait, Someone Actually Read It?",
                description: "Actually visit the Privacy Policy page. Respect.",
                icon: "secret-book",
                shape: "diamond",
                pattern: "rings",
                secret: true,
                target: 1,
            },
            secret_command_palette: {
                name: "Mouse? Never Heard of Her",
                description: "Open the Command Palette with a keyboard shortcut.",
                icon: "keyboard",
                shape: "diamond",
                pattern: "rays",
                secret: true,
                target: 1,
            },
            secret_night_owl: {
                name: "Just One More...",
                description: "Log a media update between 2:00 AM and 5:00 AM your local time.",
                icon: "owl",
                shape: "diamond",
                pattern: "rings",
                secret: true,
                target: 1,
            },
            secret_wcf_round1_loss: {
                name: "Time Is a Flat Circle",
                description: "Lose a Which Came First run on the very first round.",
                icon: "jester",
                shape: "diamond",
                pattern: "dots",
                secret: true,
                target: 1,
                calculate: wcfRoundOneLoss,
            },
            secret_harsh_critic: {
                name: "Professional Hater",
                description: "Give a title a rating of 2 or lower and write a comment explaining why.",
                icon: "thumb-down",
                shape: "diamond",
                pattern: "rays",
                secret: true,
                target: 1,
                calculate: harshCritic,
            },
            secret_love_letter: {
                name: "Certified Masterpiece",
                description: "Give a title a perfect 10 rating, favorite it, and write a comment about it.",
                icon: "love-letter",
                shape: "diamond",
                pattern: "rays",
                secret: true,
                target: 1,
                calculate: loveLetter,
            },
            secret_backlog_slayer: {
                name: "The Backlog Remembers",
                description: "Complete a title that sat in your list for over a year.",
                icon: "cobweb",
                shape: "diamond",
                pattern: "rays",
                secret: true,
                target: 1,
                calculate: backlogSlayer,
            },
            secret_superfan: {
                name: "Memorized Every Line",
                description: "Rewatch or reread the same title 3 or more times.",
                icon: "infinity",
                shape: "diamond",
                pattern: "rings",
                secret: true,
                target: 1,
                calculate: superfan,
            },
            secret_day_one: {
                name: "Day One Fan",
                description: "Complete a title within 3 days of its release date.",
                icon: "rocket",
                shape: "diamond",
                pattern: "rays",
                secret: true,
                target: 1,
                calculate: dayOne,
            },
            secret_sunk_cost: {
                name: "So Close, Yet So Dropped",
                description: "Drop a series, anime, book, or manga after reaching at least 75% progress.",
                icon: "broken-heart",
                shape: "diamond",
                pattern: "dots",
                secret: true,
                target: 1,
                calculate: sunkCost,
            },
        },
    });

    return [generalCatalog, minigamesCatalog, communityCatalog, secretsCatalog];
}
