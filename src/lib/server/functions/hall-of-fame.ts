import {createServerFn} from "@tanstack/react-start";
import {hallOfFameSearchSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getHallOfFame = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(hallOfFameSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.features.hallOfFameReader.getHallOfFame(data, currentUser?.id);
    });
