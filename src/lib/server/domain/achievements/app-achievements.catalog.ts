import {and, count, countDistinct, eq, inArray, max, or, sql, sum} from "drizzle-orm";
import {AchievementCategory, PrivacyType, Status} from "@/lib/utils/enums";
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
    userMediaUpdate,
    whichCameFirstRuns,
} from "@/lib/server/database/schema";
import {AchievementCalculation, AchievementCatalog, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


const COMPLETED_MEDIA_UNION = sql`
    SELECT l.user_id, m.name AS title, m.release_date AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM movies_list l INNER JOIN movies m ON m.id = l.media_id
    UNION ALL
    SELECT l.user_id, m.name AS title, m.release_date AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM series_list l INNER JOIN series m ON m.id = l.media_id
    UNION ALL
    SELECT l.user_id, m.name AS title, m.release_date AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM anime_list l INNER JOIN anime m ON m.id = l.media_id
    UNION ALL
    SELECT l.user_id, m.name AS title, m.release_date AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM games_list l INNER JOIN games m ON m.id = l.media_id
    UNION ALL
    SELECT l.user_id, COALESCE(l.custom_title, m.name) AS title, COALESCE(l.custom_release_date, m.release_date) AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM books_list l INNER JOIN books m ON m.id = l.media_id
    UNION ALL
    SELECT l.user_id, m.name AS title, m.release_date AS release_date, l.status, l.rating, l.comment, l.added_at, l.last_updated
    FROM manga_list l INNER JOIN manga m ON m.id = l.media_id
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
            FROM (${COMPLETED_MEDIA_UNION}) AS all_media
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
            general_polymath_all: {
                name: "Renaissance Nerd",
                description: "Complete at least 1 title in all 6 media types. Master of every medium.",
                icon: "laurel-crown",
                shape: "shield",
                pattern: "rays",
                target: 6,
                calculate: polymath,
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
                movieName: movies.name,
            })
            .from(userMediadleProgress)
            .innerJoin(dailyMediadle, eq(userMediadleProgress.dailyMediadleId, dailyMediadle.id))
            .innerJoin(movies, eq(dailyMediadle.mediaId, movies.id))
            .where(and(
                eq(userMediadleProgress.succeeded, true),
                eq(userMediadleProgress.attempts, 1),
                userId !== undefined ? eq(userMediadleProgress.userId, userId) : undefined,
            ))
            .all();

        const byUser = new Map<number, { value: number; label: string }>();
        for (const row of rows) {
            const existing = byUser.get(row.userId);
            if (!existing) byUser.set(row.userId, { value: 1, label: row.movieName });
            else existing.value += 1;
        }

        return [...byUser.entries()].map(([id, data]) => ({ userId: id, value: data.value, label: data.label }));
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
            .select({ userId: mediaTags.userId, value: count(mediaTags.id) })
            .from(mediaTags)
            .where(userId !== undefined ? eq(mediaTags.userId, userId) : undefined)
            .groupBy(mediaTags.userId)
            .all();
    };

    const followCount: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: followers.followerId, value: count(followers.followedId) })
            .from(followers)
            .where(userId !== undefined ? eq(followers.followerId, userId) : undefined)
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

    const nightOwl: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: userMediaUpdate.userId, value: count(userMediaUpdate.id) })
            .from(userMediaUpdate)
            .where(and(
                sql`CAST(strftime('%H', ${userMediaUpdate.timestamp}) AS INTEGER) BETWEEN 2 AND 4`,
                userId !== undefined ? eq(userMediaUpdate.userId, userId) : undefined,
            ))
            .groupBy(userMediaUpdate.userId)
            .all();
    };

    const harshCritic: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        return getDbClient().all<{ userId: number; value: number; label: string | null }>(sql`
            SELECT
                all_media.user_id AS userId,
                COUNT(*) AS value,
                MIN(all_media.title) AS label
            FROM (${COMPLETED_MEDIA_UNION}) AS all_media
            WHERE all_media.rating IS NOT NULL
              AND all_media.rating <= 2
              AND all_media.comment IS NOT NULL
              AND trim(all_media.comment) <> ''
              ${userClause}
            GROUP BY all_media.user_id
        `);
    };

    const backlogSlayer: AchievementCalculation = (userId) => {
        const userClause = userId !== undefined ? sql`AND all_media.user_id = ${userId}` : sql``;
        return getDbClient().all<{ userId: number; value: number; label: string | null }>(sql`
            SELECT
                all_media.user_id AS userId,
                COUNT(*) AS value,
                MIN(all_media.title) AS label
            FROM (${COMPLETED_MEDIA_UNION}) AS all_media
            WHERE all_media.status = ${Status.COMPLETED}
              AND all_media.added_at IS NOT NULL
              AND all_media.last_updated IS NOT NULL
              AND (julianday(all_media.last_updated) - julianday(all_media.added_at)) >= 365
              ${userClause}
            GROUP BY all_media.user_id
        `);
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
            secret_about_page: {
                name: "Meet the Dev",
                description: "Visit the About page to see how MyLists was built.",
                icon: "brain",
                shape: "diamond",
                pattern: "dots",
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
            secret_taste_matches: {
                name: "Media Soulmate",
                description: "Visit Taste Matches to hunt down your media twin.",
                icon: "hearts",
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
            secret_night_owl: {
                name: "Just One More...",
                description: "Log a media update between 2:00 AM and 5:00 AM.",
                icon: "owl",
                shape: "diamond",
                pattern: "rings",
                secret: true,
                target: 1,
                calculate: nightOwl,
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
        },
    });

    return [generalCatalog, minigamesCatalog, communityCatalog, secretsCatalog];
}
