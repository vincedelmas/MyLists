import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserAchievements = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user } }) => {
        const container = await getContainer();
        const achievements = container.achievements;

        const result = await achievements.getUserAchievements(user.id);
        const summary = await achievements.getUserAchievementStats(user.id);

        return {
            result,
            summary,
            userActivatedMediaTypes: await container.profile.channels.getEnabledKinds(user.id),
        };
    });
