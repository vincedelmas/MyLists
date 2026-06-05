import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserAchievements = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user } }) => {
        const achievementsService = await getContainer().then(c => c.services.achievements);

        const result = await achievementsService.getUserAchievements(user.id);
        const summary = await achievementsService.getUserAchievementStats(user.id);

        return { result, summary };
    });
