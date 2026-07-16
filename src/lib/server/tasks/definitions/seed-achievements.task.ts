import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";
import {seriesAchievements} from "@/lib/server/domain/achievements/seeds/series.seed";
import {animeAchievements} from "@/lib/server/domain/achievements/seeds/anime.seed";
import {moviesAchievements} from "@/lib/server/domain/achievements/seeds/movies.seed";
import {gamesAchievements} from "@/lib/server/domain/achievements/seeds/games.seed";
import {booksAchievements} from "@/lib/server/domain/achievements/seeds/books.seed";
import {mangaAchievements} from "@/lib/server/domain/achievements/seeds/manga.seed";


const achievementDefinitions = {
    [MediaType.SERIES]: seriesAchievements,
    [MediaType.ANIME]: animeAchievements,
    [MediaType.MOVIES]: moviesAchievements,
    [MediaType.GAMES]: gamesAchievements,
    [MediaType.BOOKS]: booksAchievements,
    [MediaType.MANGA]: mangaAchievements,
};


export const seedAchievementsTask = defineTask({
    name: "seed-achievements" as const,
    visibility: "admin",
    description: "Seed achievement definitions for all media types",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaTypes = Object.values(MediaType);
        const achievementsService = container.services.achievements;

        for (const mediaType of mediaTypes) {
            await ctx.step(`seed-${mediaType}`, async () => {
                const achievementsDef = achievementDefinitions[mediaType];

                const definitionCount = Object.keys(achievementsDef).length;
                ctx.metric(`${mediaType}.definitions_found`, definitionCount);

                if (definitionCount === 0) {
                    ctx.info(`No achievement definitions found for ${mediaType}.`);
                    return;
                }

                await withTransaction(async () => {
                    await achievementsService.seedAchievements(achievementsDef);
                });

                ctx.metric(`${mediaType}.seeded`, definitionCount);
            });
        }
    },
});
