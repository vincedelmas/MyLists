import {createServerFn} from "@tanstack/react-start";
import {tasteMatchesSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getTasteMatches = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(tasteMatchesSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const settings = await container.services.user.getMinimalUserSettings(currentUser.id);
        const activeMediaTypes = settings.filter(({ active }) => active).map(({ mediaType }) => mediaType);

        return container.services.userSimilarity.getTasteMatches(currentUser.id, data, activeMediaTypes);
    });
