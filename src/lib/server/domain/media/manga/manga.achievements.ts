import {AchievementDifficulty, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {count, eq, gte, isNotNull, lte, max, sum} from "drizzle-orm";
import {manga, mangaAuthors, mangaList} from "@/lib/server/database/schema";
import {MangaRepositoryDefinition} from "@/lib/server/domain/media/manga/manga.definition";
import {createAchievementQueries} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createMangaAchievementCatalog = (definition: MangaRepositoryDefinition) => {
    const { listTable } = definition.tables;
    const queries = createAchievementQueries(definition);

    const duration: AchievementCalculation = (achievement) => {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(manga.chapters, value) : lte(manga.chapters, value);

        const query = getDbClient()
            .select({
                userId: mangaList.userId,
                value: count(mangaList.mediaId).as("value"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id));

        return queries.applyConditionsAndGroup(query, [eq(mangaList.status, Status.COMPLETED), condition]);
    };

    const authors: AchievementCalculation = () => {
        const authorCounts = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(mangaAuthors, eq(mangaList.mediaId, mangaAuthors.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(mangaList.userId, mangaAuthors.name)
            .as("author_counts");

        return getDbClient()
            .select({
                userId: authorCounts.userId,
                value: max(authorCounts.count).as("value"),
            })
            .from(authorCounts)
            .groupBy(authorCounts.userId)
            .as("calculation");
    };

    const publishers: AchievementCalculation = () => {
        const publisherCounts = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(manga.id, mangaList.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(mangaList.userId, manga.publishers)
            .as("publisher_counts");

        return getDbClient()
            .select({
                userId: publisherCounts.userId,
                value: max(publisherCounts.count).as("value"),
            })
            .from(publisherCounts)
            .groupBy(publisherCounts.userId)
            .as("calculation");
    };

    const chapters: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: mangaList.userId,
                value: sum(mangaList.total).as("value"),
            })
            .from(mangaList);

        return queries.applyConditionsAndGroup(query, []);
    };

    return defineAchievementCatalog({
        mediaType: definition.mediaType,
        entries: {
            completed_manga: {
                name: "Finish Line Hero",
                description: "Awarded for completing manga, because you have more commitment to them than your real-life relationships",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 30 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 80 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 150 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(eq(listTable.status, Status.COMPLETED)),
            },
            rated_manga: {
                name: "Opinionated Otaku",
                description: "Awarded for rating manga, because everyone needs to know your totally professional 2AM judgment calls.",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 30 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            comment_manga: {
                name: "Keyboard Warrior Sensei",
                description: "Awarded for commenting manga, because typing 'OMG THAT PLOT TWIST!!1!' is literary criticism now.",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 30 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(isNotNull(listTable.comment)),
            },
            author_manga: {
                name: "Stalker-san",
                description: "Awarded for completing manga from the same author, because following someone's entire career isn't creepy at all.",
                tiers: [
                    { criteria: { count: 2 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 4 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: authors,
            },
            publisher_manga: {
                name: "Corporate Loyalty",
                description: "Awarded for completing manga from the same publisher, because brand loyalty is totally a personality trait.",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: publishers,
            },
            short_manga: {
                name: "Commitment Issues",
                description: "Awarded for completing manga with less than 5 volumes, because good things come in small packages (or you're just lazy).",
                value: 5,
                tiers: [
                    { criteria: { count: 2 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 4 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: duration,
            },
            long_manga: {
                name: "Marathon Masochist",
                description: "Awarded for completing manga with more than 50 volumes, because who needs sleep when you have 1000+ chapters to read?",
                value: 50,
                tiers: [
                    { criteria: { count: 1 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 2 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 4 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: duration,
            },
            chapter_manga: {
                name: "Page Turner Pro",
                description: "Awarded for reading LOTS of manga chapters, because who needs vitamin D when you have manga?",
                tiers: [
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 500 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 1000 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 5000 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: chapters,
            },
            hentai_manga: {
                name: "Yamete Senpai",
                description: "Awarded for completing hentai manga, because 'I read it for the plot' needed its own achievement.",
                value: "Hentai",
                tiers: [
                    { criteria: { count: 1 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 2 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 4 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countCompletedGenre,
            },
            shounen_manga: {
                name: "Power of Friendship",
                description: "Awarded for completing shounen manga, because screaming makes you stronger and that's just science.",
                value: "Shounen",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 6 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 9 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countCompletedGenre,
            },
            seinen_manga: {
                name: "Sophisticated Weeb",
                description: "Awarded for completing seinen manga, because reading about existential crises makes you mature.",
                value: "Seinen",
                tiers: [
                    { criteria: { count: 2 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 4 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 6 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countCompletedGenre,
            }
        },
    });
};
