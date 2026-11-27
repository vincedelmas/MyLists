import {createServerFn} from "@tanstack/react-start";
import {AchievementCategory} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {postFeatureDeleteSchema, postFeatureRequestSchema, postFeatureStatusSchema, postFeatureVoteSchema} from "@/lib/schemas";
import {publicAuthMiddleware, requiredAuthAndAdminRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getFeatureVotes = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        return featureVotesService.getFeatureVotes(currentUser?.id);
    });


export const postCreateFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(postFeatureRequestSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        container.services.featureVotes.createFeatureRequest(currentUser.id, data);
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, [AchievementCategory.COMMUNITY]);
        return { unlockedAchievements };
    });


export const postToggleFeatureVote = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(postFeatureVoteSchema)
    .handler(async ({ data: { featureId }, context: { currentUser } }) => {
        const container = await getContainer();
        container.services.featureVotes.toggleFeatureVote(featureId, currentUser.id);
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, [AchievementCategory.COMMUNITY]);
        return { unlockedAchievements };
    });


export const postAdminUpdateFeatureStatus = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(postFeatureStatusSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        featureVotesService.updateFeatureStatus(data, currentUser.id);
    });


export const postAdminDeleteFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(postFeatureDeleteSchema)
    .handler(async ({ data }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        featureVotesService.deleteFeatureRequest(data.featureId);
    });
