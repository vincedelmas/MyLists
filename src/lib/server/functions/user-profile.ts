import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {simpleSearchUsernameSchema} from "@/lib/schemas";
import {authorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserProfileHeader = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .handler(async ({ context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        const { followersCount, followsCount } = await userService.getFollowCount(targetUser.id);
        const followStatus = currentUser && await userService.getFollowingStatus(currentUser.id, targetUser.id);

        return {
            userData: {
                id: targetUser.id,
                name: targetUser.name,
                image: targetUser.image,
                privacy: targetUser.privacy,
                createdAt: targetUser.createdAt,
                backgroundImage: targetUser.backgroundImage,
                userMediaSettings: targetUser.userMediaSettings.map(({ timeSpent, active }) => ({
                    timeSpent,
                    active,
                })),
            },
            social: {
                followsCount,
                followStatus,
                followersCount,
                followId: targetUser.id,
            }
        };
    });


export const getUserProfile = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { currentUser, user } }) => {
        const targetUserId = user.id;
        const container = await getContainer();
        const userService = container.services.user;
        const userStatsService = container.services.userStats;
        const userProfileService = container.services.userProfile;
        const userUpdatesService = container.services.userUpdates;
        const achievementsService = container.services.achievements;

        if (currentUser && currentUser.id !== targetUserId) {
            await userService.incrementProfileView(targetUserId);
        }

        const { followsCount } = await userService.getFollowCount(targetUserId);
        const userFollows = await userService.getUserFollows(undefined, targetUserId);
        const userUpdates = await userUpdatesService.getUserUpdates(targetUserId);
        const followsUpdates = await userUpdatesService.getFollowsUpdates(targetUserId, currentUser?.id);
        const mediaGlobalSummary = await userStatsService.userPreComputedStatsSummary(targetUserId);
        const perMediaSummary = await userStatsService.userPerMediaSummaryStats(targetUserId);
        const highlightedMedia = await userProfileService.resolveHighlightedMedia(targetUserId);
        const achievements = await achievementsService.getAchievementsDetails(targetUserId);

        return {
            userUpdates,
            userFollows,
            achievements,
            followsCount,
            followsUpdates,
            perMediaSummary,
            highlightedMedia,
            mediaGlobalSummary,
            userData: {
                id: user.id,
                name: user.name,
                image: user.image,
                privacy: user.privacy,
                createdAt: user.createdAt,
                ratingSystem: user.ratingSystem,
                backgroundImage: user.backgroundImage,
                userMediaSettings: user.userMediaSettings.map(({ mediaType, timeSpent, active }) => ({
                    active,
                    mediaType,
                    timeSpent,
                })),
            },
        };
    });


export const getUsersFollows = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        return userService.getUserFollows(currentUser?.id, user.id, 999999);
    });


export const getUsersFollowers = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        return userService.getUserFollowers(currentUser?.id, user.id, 999999);
    });


export const getAllUpdatesHistory = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(simpleSearchUsernameSchema)
    .handler(async ({ data, context: { user } }) => {
        const userUpdatesService = await getContainer().then((c) => c.services.userUpdates);
        return userUpdatesService.getUserUpdatesPaginated(data, user.id);
    });


export const postUpdateShowOnboarding = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        await userService.updateShowOnboarding(currentUser.id);
    });
