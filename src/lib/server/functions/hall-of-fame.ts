import {searchTypeSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getHallOfFame = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userStatsService = await getContainer().then((c) => c.services.userStats);
        return userStatsService.userHallofFameData(data, currentUser?.id);
    });
