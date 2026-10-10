import {DenialReason} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {getDynamicListEditorFilterOptions, getDynamicListResults, getDynamicListSummary} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";
import {optionalMediaAuthMiddleware, requiredMediaReadMiddleware, requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";
import {dynamicListDetailsSchema, dynamicListIdSchema, dynamicListPreviewSchema, dynamicListSpecSchema, dynamicListUpdateSchema} from "@/lib/schemas/dynamic-lists.schema";


export const getDynamicLists = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .handler(({ context: { currentUser } }) => {
        return dynamicListsRepository.getAll(currentUser.id);
    });


export const getDynamicListEditor = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(dynamicListIdSchema)
    .handler(({ data: { id }, context: { currentUser } }) => {
        return dynamicListsRepository.get(currentUser.id, id);
    });


export const getDynamicListEditorFilters = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(dynamicListSpecSchema.pick({ mediaTypes: true }))
    .handler(({ data: { mediaTypes }, context: { currentUser } }) => {
        return getDynamicListEditorFilterOptions(currentUser.id, mediaTypes);
    });


export const getDynamicList = createServerFn({ method: "GET" })
    .middleware([optionalMediaAuthMiddleware])
    .validator(dynamicListDetailsSchema)
    .handler(async ({ data: { id, page, filters, includeFilterOptions }, context: { currentUser } }) => {
        const access = mcpRequestContext.getStore();
        if (access) {
            const view = dynamicListsRepository.get(access.userId, id);

            return {
                isOwner: true, owner: { username: access.username },
                activeMediaTypes: dynamicListsRepository.getOwner(id).activeMediaTypes,
                view, results: getDynamicListResults(access.userId, view.spec, { page, filters, includeFilterOptions, viewerId: access.userId }),
            };
        }

        const owner = dynamicListsRepository.getOwner(id);
        const isOwner = currentUser?.id === owner.id;

        if (!isOwner) {
            const container = await getContainer();
            const decision = await container.services.authorization.decideProfile(toActor(currentUser), owner);

            if (!decision.allowed) {
                throw new UnauthorizedError(decision.reason === DenialReason.PROFILE_RESTRICTED ? "restricted" : "private");
            }
        }

        const view = dynamicListsRepository.get(owner.id, id);

        return {
            isOwner, owner: { username: owner.username },
            activeMediaTypes: owner.activeMediaTypes,
            view, results: getDynamicListResults(owner.id, view.spec, { page, filters, includeFilterOptions, viewerId: currentUser?.id }),
        };
    });


export const previewDynamicList = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .validator(dynamicListPreviewSchema)
    .handler(({ data: { spec, page }, context: { currentUser } }) => {
        return getDynamicListResults(currentUser.id, spec, { page });
    });


export const previewDynamicListSummary = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(dynamicListSpecSchema)
    .handler(({ data, context: { currentUser } }) => {
        return getDynamicListSummary(currentUser.id, data);
    });


export const postCreateDynamicList = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(dynamicListSpecSchema)
    .handler(({ data, context: { currentUser } }) => {
        return dynamicListsRepository.create(currentUser.id, data);
    });


export const postUpdateDynamicList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(dynamicListUpdateSchema)
    .handler(({ data: { id, spec }, context: { currentUser } }) => {
        return dynamicListsRepository.update(currentUser.id, id, spec);
    });


export const postDeleteDynamicList = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(dynamicListIdSchema)
    .handler(({ data: { id }, context: { currentUser } }) => {
        return dynamicListsRepository.delete(currentUser.id, id);
    });


