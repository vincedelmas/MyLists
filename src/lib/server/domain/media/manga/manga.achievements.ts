import {AchievementCategory, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, eq, gt, gte, isNotNull, lte, sql} from "drizzle-orm";
import {manga, mangaAuthors, mangaList} from "@/lib/server/database/schema";
import {MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {createAchievementQueries, pickTopPerUser} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createMangaAchievementCatalog = (definition: MangaServerDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const queries = createAchievementQueries(repository);

    const completedManga = queries.countList(eq(listTable.status, Status.COMPLETED));

    const shortManga: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: mangaList.userId, value: count(mangaList.mediaId) })
            .from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id))
            .where(and(
                eq(mangaList.status, Status.COMPLETED),
                isNotNull(manga.volumes),
                gt(manga.volumes, 0),
                lte(manga.volumes, 5),
                queries.userFilter(userId),
            ))
            .groupBy(mangaList.userId)
            .all();
    };

    const longManga: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: mangaList.userId, value: count(mangaList.mediaId) })
            .from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id))
            .where(and(
                eq(mangaList.status, Status.COMPLETED),
                isNotNull(manga.volumes),
                gte(manga.volumes, 30),
                queries.userFilter(userId),
            ))
            .groupBy(mangaList.userId)
            .all();
    };

    const authors: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: mangaList.userId,
                label: mangaAuthors.name,
                count: count(mangaList.mediaId),
            })
            .from(mangaList)
            .innerJoin(mangaAuthors, eq(mangaList.mediaId, mangaAuthors.mediaId))
            .where(and(eq(mangaList.status, Status.COMPLETED), queries.userFilter(userId)))
            .groupBy(mangaList.userId, mangaAuthors.name)
            .all();

        return pickTopPerUser(rows);
    };

    const chaptersRead: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: mangaList.userId,
                value: sql<number>`COALESCE(SUM(${mangaList.total}), 0)`,
            })
            .from(mangaList)
            .where(queries.userFilter(userId))
            .groupBy(mangaList.userId)
            .all();
    };

    return defineAchievementCatalog({
        category: AchievementCategory.MANGA,
        mediaType: identity.mediaType,
        entries: {
            manga_first: {
                name: "First Volume",
                description: "Complete your first manga. Right to left feels natural now.",
                icon: "scroll",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: completedManga,
            },
            manga_25: {
                name: "Finish Line Hero",
                description: "Complete 25 manga. More commitment than most real-life hobbies.",
                icon: "book-pile",
                shape: "octagon",
                pattern: "rays",
                target: 25,
                calculate: completedManga,
            },
            manga_100: {
                name: "Mangaka's Muse",
                description: "Complete 100 manga series from first chapter to epilogue.",
                icon: "crown",
                shape: "shield",
                pattern: "rays",
                target: 100,
                calculate: completedManga,
            },
            manga_rated_25: {
                name: "Opinionated Otaku",
                description: "Rate 25 manga with your totally objective 2 AM judgment calls.",
                icon: "stars",
                shape: "circle",
                pattern: "dots",
                target: 25,
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            manga_commented_15: {
                name: "Keyboard Warrior Sensei",
                description: "Comment on 15 manga, because screaming about plot twists counts as criticism.",
                icon: "chat",
                shape: "circle",
                pattern: "dots",
                target: 15,
                calculate: queries.countNonEmptyComment(),
            },
            manga_author_3: {
                name: "Career Follower",
                description: "Complete 3 manga by the same author. Following their entire bibliography.",
                icon: "quill",
                shape: "hex",
                pattern: "rays",
                target: 3,
                calculate: authors,
            },
            manga_chapters_1000: {
                name: "Page Turner Pro",
                description: "Read 1,000 manga chapters across your library.",
                icon: "open-book",
                shape: "octagon",
                pattern: "rings",
                target: 1000,
                calculate: chaptersRead,
            },
            manga_short_5: {
                name: "Short & Sweet",
                description: "Complete 5 manga with 5 or fewer volumes. Good things come in compact runs.",
                icon: "stopwatch",
                shape: "circle",
                pattern: "rings",
                target: 5,
                calculate: shortManga,
            },
            manga_long_2: {
                name: "Marathon Masochist",
                description: "Complete 2 manga with 30+ volumes. Who needs sleep when there are arcs to finish?",
                icon: "hourglass",
                shape: "octagon",
                pattern: "rays",
                target: 2,
                calculate: longManga,
            },
            manga_genres_6: {
                name: "Genre Collector",
                description: "Complete manga across 6 different genres, from quiet slice-of-life to epic battles.",
                icon: "katana",
                shape: "hex",
                pattern: "dots",
                target: 6,
                calculate: queries.countDistinctGenres(),
            },
        },
    });
};
