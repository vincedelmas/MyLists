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

        return mediadleService.getDailyMediadleData(currentUser?.id);
    });


export const getMediadleSuggestions = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediadleSuggestionsSchema)
    .handler(async ({ data: { query } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        return mediadleService.searchSuggestions(query);
    });


export const postAddMediadleGuess = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMediadleGuessSchema)
    .handler(async ({ data: { guess }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediadleService = container.services.mediadle;
        return mediadleService.addMediadleGuess(currentUser.id, guess);
    });
