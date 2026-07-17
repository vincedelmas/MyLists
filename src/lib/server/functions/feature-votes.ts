import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {postFeatureDeleteSchema, postFeatureRequestSchema, postFeatureStatusSchema, postFeatureVoteSchema} from "@/lib/schemas";
import {publicAuthMiddleware, requiredAuthAndAdminRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getFeatureVotes = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const query = await getContainer().then((c) => c.featureVotes.query);
        return query.getFeatureVotes(currentUser?.id);
    });


export const postCreateFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(postFeatureRequestSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const commands = await getContainer().then((c) => c.featureVotes.commands);
        await commands.createFeatureRequest(currentUser.id, data);
    });


export const postToggleFeatureVote = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(postFeatureVoteSchema)
    .handler(async ({ data: { featureId }, context: { currentUser } }) => {
        const commands = await getContainer().then((c) => c.featureVotes.commands);
        await commands.toggleFeatureVote(featureId, currentUser.id);
    });


export const postAdminUpdateFeatureStatus = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware, transactionMiddleware])
    .validator(postFeatureStatusSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const commands = await getContainer().then((c) => c.featureVotes.commands);
        await commands.updateFeatureStatus(data, currentUser.id);
    });


export const postAdminDeleteFeatureRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware, transactionMiddleware])
    .validator(postFeatureDeleteSchema)
    .handler(async ({ data }) => {
        const commands = await getContainer().then((c) => c.featureVotes.commands);
        await commands.deleteFeatureRequest(data.featureId);
    });
