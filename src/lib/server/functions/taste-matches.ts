import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {tasteMatchesSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getTasteMatches = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(tasteMatchesSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const settings = await container.services.user.getMinimalUserSettings(currentUser.id);

        const actor = toActor(currentUser);
        const activeMediaTypes = getActiveMediaTypes(settings);

        if (actor.kind === "anonymous") {
            throw new Error("Authenticated taste-match request resolved without an actor.");
        }

        return container.services.userSimilarity.getTasteMatches(actor, data, activeMediaTypes);
    });
