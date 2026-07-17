import {createServerFn} from "@tanstack/react-start";
import {tasteMatchesSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getTasteMatches = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(tasteMatchesSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.discovery.tasteMatches.getTasteMatches(currentUser.id, data);
    });
