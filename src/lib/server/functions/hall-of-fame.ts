import {createServerFn} from "@tanstack/react-start";
import {hallOfFameSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getHallOfFame = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(hallOfFameSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const statsService = await getContainer().then((c) => c.services.stats);
        return statsService.userHallOfFameData(data, currentUser?.id);
    });
