import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {simpleSearchUsernameSchema} from "@/lib/schemas";
import {getPublishedMediaSettings} from "@/lib/utils/media-list-activation";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware, publicPreviewMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserProfileHeader = createServerFn({ method: "GET" })
    .middleware([publicPreviewMiddleware])
    .handler(async ({ context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;

        const { followersCount, followsCount } = await socialService.getFollowCount(targetUser.id);
        const followStatus = currentUser && await socialService.getFollowingStatus(currentUser.id, targetUser.id);

        return {
            userData: {
                id: targetUser.id,
                name: targetUser.name,
                image: targetUser.image,
                privacy: targetUser.privacy,
                createdAt: targetUser.createdAt,
                backgroundImage: targetUser.backgroundImage,
                userMediaSettings: getPublishedMediaSettings(targetUser.userMediaSettings).map(({ timeSpent, active, mediaType }) => ({
                    active,
                    mediaType,
                    timeSpent,
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


export const getRandomPublicProfile = createServerFn({ method: "GET" })
    .handler(async () => {
        const profileService = await getContainer().then((container) => container.services.profile);
        return profileService.getRandomPublicProfile();
    });


export const getUserProfile = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .handler(async ({ context: { currentUser, user } }) => {
        const targetUserId = user.id;
        const container = await getContainer();
        const socialService = container.services.social;
        const statsService = container.services.stats;
        const profileService = container.services.profile;
        const updateHistoryService = container.services.updateHistory;
        const achievementsService = container.services.achievements;

        if (currentUser && currentUser.id !== targetUserId) {
            await profileService.incrementProfileView(targetUserId);
        }

        const { followsCount } = await socialService.getFollowCount(targetUserId);
        const userFollows = await socialService.getUserFollows(undefined, targetUserId);
        const userUpdates = await updateHistoryService.getUserUpdates(targetUserId);
        const followsUpdates = await updateHistoryService.getFollowsUpdates(targetUserId, toActor(currentUser));
        const mediaGlobalSummary = await statsService.userPreComputedStatsSummary(targetUserId);
        const perMediaSummary = await statsService.userPerMediaSummaryStats(targetUserId);
        const highlightedMedia = await profileService.resolveHighlightedMedia(targetUserId);
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
                userMediaSettings: getPublishedMediaSettings(user.userMediaSettings).map(({ mediaType, timeSpent, active }) => ({
                    active,
                    mediaType,
                    timeSpent,
                })),
            },
        };
    });


export const getUsersFollows = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .handler(async ({ context: { user, currentUser } }) => {
        const socialService = await getContainer().then((c) => c.services.social);
        return socialService.getUserFollows(currentUser?.id, user.id, 999999);
    });


export const getUsersFollowers = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .handler(async ({ context: { user, currentUser } }) => {
        const socialService = await getContainer().then((c) => c.services.social);
        return socialService.getUserFollowers(currentUser?.id, user.id, 999999);
    });


export const getAllUpdatesHistory = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(simpleSearchUsernameSchema)
    .handler(async ({ data, context: { user } }) => {
        const updateHistoryService = await getContainer().then((c) => c.services.updateHistory);
        return updateHistoryService.getUserUpdatesPaginated(data, user.id);
    });


export const postUpdateShowOnboarding = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const accountService = container.services.account;
        await accountService.updateShowOnboarding(currentUser.id);
    });
