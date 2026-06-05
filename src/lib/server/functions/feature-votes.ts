import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {tryFormZodError} from "@/lib/utils/try-not-found";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {postFeatureDeleteSchema, postFeatureRequestSchema, postFeatureStatusSchema, postFeatureVoteSchema} from "@/lib/schemas";
import {publicAuthMiddleware, requiredAuthAndAdminRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getFeatureVotes = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        return featureVotesService.getFeatureVotes(currentUser?.id);
    });


export const postCreateFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .inputValidator(tryFormZodError(postFeatureRequestSchema))
    .handler(async ({ data, context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        await featureVotesService.createFeatureRequest(currentUser.id, data);
    });


export const postToggleFeatureVote = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .inputValidator(postFeatureVoteSchema)
    .handler(async ({ data: { featureId }, context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        await featureVotesService.toggleFeatureVote(featureId, currentUser.id);
    });


export const postAdminUpdateFeatureStatus = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware, transactionMiddleware])
    .inputValidator(tryFormZodError(postFeatureStatusSchema))
    .handler(async ({ data, context: { currentUser } }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        await featureVotesService.updateFeatureStatus(data, currentUser.id);
    });


export const postAdminDeleteFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware, transactionMiddleware])
    .inputValidator(tryFormZodError(postFeatureDeleteSchema))
    .handler(async ({ data }) => {
        const featureVotesService = await getContainer().then((c) => c.services.featureVotes);
        await featureVotesService.deleteFeatureRequest(data.featureId);
    });
