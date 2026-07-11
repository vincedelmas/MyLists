import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {addMediadleGuessSchema, mediadleSuggestionsSchema} from "@/lib/schemas";
import {publicAuthMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getDailyMediadle = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);

        return mediadleService.getDailyMediadleData(moviesService, currentUser?.id);
    });


export const getMediadleSuggestions = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediadleSuggestionsSchema)
    .handler(async ({ data: { query } }) => {
        const container = await getContainer();
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);
        return moviesService.searchMediadleSuggestion(query);
    });


export const postAddMediadleGuess = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediadleGuessSchema)
    .handler(async ({ data: { guess }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        const moviesService = container.registries.mediaService.get(MediaType.MOVIES);
        return mediadleService.addMediadleGuess(currentUser.id, guess, moviesService);
    });
