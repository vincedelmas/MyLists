import {createServerFn} from "@tanstack/react-start";
import {tasteMatchesSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getTasteMatches = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(tasteMatchesSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userSimilarityService = await getContainer().then((container) => container.services.userSimilarity);
        return userSimilarityService.getTasteMatches(currentUser.id, data);
    });
