import * as z from "zod";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {CLIENT_EVENT_ACHIEVEMENT_CODES} from "@/lib/types/achievements.types";
import {PROFILE_MAX_PINNED_ACHIEVEMENTS} from "@/lib/types/profile-custom.types";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserAchievements = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .handler(async ({ context: { user, currentUser } }) => {
        const container = await getContainer();
        const pinnedCodeNames = await container.services.profile.getPinnedAchievements(user.id);
        const pageData = container.services.achievements.getUserAchievementsPageData(user.id, currentUser?.id, pinnedCodeNames);

        return {
            ...pageData,
            isOwner: currentUser?.id === user.id,
            userActivatedMediaTypes: user.userMediaSettings.filter((s) => s.active).map((s) => s.mediaType),
        };
    });


export const postTogglePinnedAchievement = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ codeName: z.string().min(1) }))
    .handler(async ({ data: { codeName }, context: { currentUser } }) => {
        const container = await getContainer();
        const currentPinned = await container.services.profile.getPinnedAchievements(currentUser.id);

        if (!currentPinned.includes(codeName)) {
            if (currentPinned.length >= PROFILE_MAX_PINNED_ACHIEVEMENTS) {
                throw new FormattedError(`You can pin up to ${PROFILE_MAX_PINNED_ACHIEVEMENTS} achievements to your profile.`);
            }

            const unlocked = container.repositories.achievements.getUnlockedAchievementsForProfile(currentUser.id);
            if (!unlocked.some((item) => item.codeName === codeName)) {
                throw new FormattedError("Only unlocked achievements can be pinned to your profile.");
            }
        }

        return container.services.profile.togglePinnedAchievement(currentUser.id, codeName);
    });


export const postUnlockClientAchievement = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ codeName: z.enum(CLIENT_EVENT_ACHIEVEMENT_CODES) }))
    .handler(async ({ data: { codeName }, context: { currentUser } }) => {
        const container = await getContainer();
        const unlocked = container.services.achievements.unlockEventAchievement(currentUser.id, codeName);
        return { unlocked };
    });
