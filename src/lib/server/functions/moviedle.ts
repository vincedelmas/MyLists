import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {addMediadleGuessSchema, mediadleSuggestionsSchema} from "@/lib/schemas";
import {publicAuthMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getDailyMediadle = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);

        return mediadleService.getDailyMediadleData(moviesService, currentUser?.id);
    });


export const getMediadleLeaderboard = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const mediadleService = await getContainer().then((container) => container.services.mediadle);
        return mediadleService.getLeaderboard(currentUser?.id);
    });


export const getMediadleSuggestions = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediadleSuggestionsSchema)
    .handler(async ({ data: { query } }) => {
        const container = await getContainer();
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);
        return moviesService.searchMediadleSuggestion(query);
    });


export const postAddMediadleGuess = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(addMediadleGuessSchema)
    .handler(async ({ data: { guess }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);
        const result = mediadleService.addMediadleGuess(currentUser.id, guess, moviesService);
        const unlockedAchievements = result.completed
            ? container.services.achievements.evaluateUserCategories(currentUser.id, [AchievementCategory.MINIGAMES])
            : [];

        return { ...result, unlockedAchievements };
    });
