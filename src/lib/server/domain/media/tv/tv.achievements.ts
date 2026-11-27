import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementCategory, MediaType, Status} from "@/lib/utils/enums";
import {and, count, countDistinct, eq, gt, gte, isNotNull, lte, ne} from "drizzle-orm";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {createAchievementQueries, pickTopPerUser} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export const createTvAchievementCatalog = (definition: TvDefinition) => {
    const { identity, repository } = definition;
    const { mediaTable, listTable, actorTable, networkTable } = repository.tables;
    const queries = createAchievementQueries(repository);

    const completedShows = queries.countList(eq(listTable.status, Status.COMPLETED));

    const shortShows = (maxEpisodes: number): AchievementCalculation => (userId) => {
        return getDbClient()
            .select({ userId: listTable.userId, value: count(listTable.mediaId) })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                eq(listTable.status, Status.COMPLETED),
                gt(mediaTable.totalEpisodes, 0),
                lte(mediaTable.totalEpisodes, maxEpisodes),
                queries.userFilter(userId),
            ))
            .groupBy(listTable.userId)
            .all();
    };

    const longShows = (minEpisodes: number): AchievementCalculation => (userId) => {
        return getDbClient()
            .select({ userId: listTable.userId, value: count(listTable.mediaId) })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                eq(listTable.status, Status.COMPLETED),
                gte(mediaTable.totalEpisodes, minEpisodes),
                queries.userFilter(userId),
            ))
            .groupBy(listTable.userId)
            .all();
    };

    const networks: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: listTable.userId, value: countDistinct(networkTable.name) })
            .from(listTable)
            .innerJoin(networkTable, eq(listTable.mediaId, networkTable.mediaId))
            .where(and(ne(listTable.status, Status.PLANNED), queries.userFilter(userId)))
            .groupBy(listTable.userId)
            .all();
    };

    const actor: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: listTable.userId,
                label: actorTable.name,
                count: count(listTable.mediaId),
            })
            .from(listTable)
            .innerJoin(actorTable, eq(listTable.mediaId, actorTable.mediaId))
            .where(and(eq(listTable.status, Status.COMPLETED), queries.userFilter(userId)))
            .groupBy(listTable.userId, actorTable.name)
            .all();

        return pickTopPerUser(rows);
    };

    if (identity.mediaType === MediaType.ANIME) {
        return defineAchievementCatalog({
            category: AchievementCategory.ANIME,
            mediaType: identity.mediaType,
            entries: {
                anime_first: {
                    name: "Isekai'd",
                    description: "Complete your first anime. Welcome to the rabbit hole.",
                    icon: "bridge",
                    shape: "circle",
                    pattern: "rings",
                    target: 1,
                    calculate: completedShows,
                },
                anime_30: {
                    name: "Binge No Jutsu",
                    description: "Complete 30 anime, because who needs sleep when there's just one more episode?",
                    icon: "ninja",
                    shape: "octagon",
                    pattern: "rays",
                    target: 30,
                    calculate: completedShows,
                },
                anime_120: {
                    name: "Anime Sensei",
                    description: "Complete 120 anime. You can recognize an opening theme in 0.4 seconds.",
                    icon: "crown",
                    shape: "shield",
                    pattern: "rays",
                    target: 120,
                    calculate: completedShows,
                },
                anime_rated_30: {
                    name: "Rate My Waifu",
                    description: "Rate 30 anime, because judging seasonal shows is serious business.",
                    icon: "stars",
                    shape: "circle",
                    pattern: "dots",
                    target: 30,
                    calculate: queries.countList(isNotNull(listTable.rating)),
                },
                anime_commented_15: {
                    name: "Weeb-splainer",
                    description: "Comment on 15 anime, because sometimes a 3-paragraph rant about plot holes is mandatory.",
                    icon: "chat",
                    shape: "circle",
                    pattern: "dots",
                    target: 15,
                    calculate: queries.countNonEmptyComment(),
                },
                anime_seiyuu_10: {
                    name: "Seiyuu Sensei",
                    description: "Complete 10 anime featuring the same voice actor. You spot that voice instantly.",
                    icon: "microphone",
                    shape: "hex",
                    pattern: "rays",
                    target: 10,
                    calculate: actor,
                },
                anime_short_12: {
                    name: "One-Cour Wonder",
                    description: "Complete 12 anime with 13 or fewer episodes. Still praying for season 2.",
                    icon: "stopwatch",
                    shape: "circle",
                    pattern: "rings",
                    target: 12,
                    calculate: shortShows(13),
                },
                anime_long_3: {
                    name: "Filler Arc Survivor",
                    description: "Complete 3 anime with 150+ episodes. You survived 50 flashbacks and 20 beach episodes.",
                    icon: "hourglass",
                    shape: "octagon",
                    pattern: "rays",
                    target: 3,
                    calculate: longShows(150),
                },
                anime_shonen_15: {
                    name: "Shonen Showdown",
                    description: "Complete 15 Shounen anime, because power-ups and friendship speeches never get old.",
                    icon: "punch",
                    shape: "hex",
                    pattern: "rays",
                    target: 15,
                    calculate: queries.countCompletedGenre("Shounen"),
                },
                anime_seinen_8: {
                    name: "Seinen Sage",
                    description: "Complete 8 Seinen anime. Too deep into complex plots for ordinary slice-of-life.",
                    icon: "katana",
                    shape: "hex",
                    pattern: "dots",
                    target: 8,
                    calculate: queries.countCompletedGenre("Seinen"),
                },
            },
        });
    }

    return defineAchievementCatalog({
        category: AchievementCategory.SERIES,
        mediaType: identity.mediaType,
        entries: {
            series_first: {
                name: "Pilot Episode",
                description: "Complete your first TV series from pilot to finale.",
                icon: "tv",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: completedShows,
            },
            series_25: {
                name: "Binge Watcher",
                description: "Complete 25 series. 'Are you still watching?' is practically a personal insult.",
                icon: "video-camera",
                shape: "octagon",
                pattern: "rays",
                target: 25,
                calculate: completedShows,
            },
            series_100: {
                name: "Couch Potato Supreme",
                description: "Complete 100 series. Finishing what you started is a true feat.",
                icon: "crown",
                shape: "shield",
                pattern: "rays",
                target: 100,
                calculate: completedShows,
            },
            series_rated_30: {
                name: "TV Critic",
                description: "Rate 30 series and share your verdict with the world.",
                icon: "stars",
                shape: "circle",
                pattern: "dots",
                target: 30,
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            series_commented_15: {
                name: "Episode Debriefer",
                description: "Comment on 15 series, because that finale needed to be dissected.",
                icon: "chat",
                shape: "circle",
                pattern: "dots",
                target: 15,
                calculate: queries.countNonEmptyComment(),
            },
            series_actor_8: {
                name: "Familiar Face",
                description: "Complete 8 series featuring the same actor.",
                icon: "masks",
                shape: "hex",
                pattern: "rays",
                target: 8,
                calculate: actor,
            },
            series_short_10: {
                name: "Miniseries Connoisseur",
                description: "Complete 10 limited series with 8 or fewer episodes. Tight storytelling wins.",
                icon: "stopwatch",
                shape: "circle",
                pattern: "rings",
                target: 10,
                calculate: shortShows(8),
            },
            series_long_3: {
                name: "Marathon Maverick",
                description: "Complete 3 series with 150+ episodes. True commitment to the long haul.",
                icon: "hourglass",
                shape: "octagon",
                pattern: "rays",
                target: 3,
                calculate: longShows(150),
            },
            series_networks_20: {
                name: "Channel Surfer",
                description: "Watch series from 20 different networks. Mastering the remote like a pro.",
                icon: "radio-tower",
                shape: "hex",
                pattern: "rings",
                target: 20,
                calculate: networks,
            },
            series_drama_25: {
                name: "Drama Queen",
                description: "Complete 25 Drama series, embracing every emotional roller-coaster.",
                icon: "sparkles",
                shape: "hex",
                pattern: "dots",
                target: 25,
                calculate: queries.countCompletedGenre("Drama"),
            },
        },
    });
};
