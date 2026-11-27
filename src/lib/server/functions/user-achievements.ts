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
        const unlockedCodes = new Set(
            container.repositories.achievements.getUnlockedAchievementsForProfile(currentUser.id).map((item) => item.codeName),
        );
        const visiblePinned = (await container.services.profile.getPinnedAchievements(currentUser.id))
            .filter((code) => unlockedCodes.has(code));

        const exists = visiblePinned.includes(codeName);
        if (!exists) {
            if (visiblePinned.length >= PROFILE_MAX_PINNED_ACHIEVEMENTS) {
                throw new FormattedError(`You can pin up to ${PROFILE_MAX_PINNED_ACHIEVEMENTS} achievements to your profile.`);
            }
            if (!unlockedCodes.has(codeName)) {
                throw new FormattedError("Only unlocked achievements can be pinned to your profile.");
            }
        }

        const next = exists
            ? visiblePinned.filter((code) => code !== codeName)
            : [...visiblePinned, codeName];

        const pinnedCodeNames = container.services.profile.savePinnedAchievements(currentUser.id, next);
        return { pinnedCodeNames, pinned: !exists };
    });


export const postReorderPinnedAchievements = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ codeNames: z.array(z.string().min(1)).max(PROFILE_MAX_PINNED_ACHIEVEMENTS) }))
    .handler(async ({ data: { codeNames }, context: { currentUser } }) => {
        const container = await getContainer();
        const unlockedCodes = new Set(
            container.repositories.achievements.getUnlockedAchievementsForProfile(currentUser.id).map((item) => item.codeName),
        );
        const validOrdered = codeNames.filter((code) => unlockedCodes.has(code));
        const pinnedCodeNames = container.services.profile.savePinnedAchievements(currentUser.id, validOrdered);
        return { pinnedCodeNames };
    });


export const postUnlockClientAchievement = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ codeName: z.enum(CLIENT_EVENT_ACHIEVEMENT_CODES) }))
    .handler(async ({ data: { codeName }, context: { currentUser } }) => {
        const container = await getContainer();
        const unlocked = container.services.achievements.unlockEventAchievement(currentUser.id, codeName);
        return { unlocked };
    });
