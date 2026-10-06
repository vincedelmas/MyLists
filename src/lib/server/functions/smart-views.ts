import {DenialReason} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {getSmartViewEditorFilterOptions, getSmartViewResults, getSmartViewSummary} from "@/lib/server/domain/smart-views/smart-views.queries";
import {smartViewsRepository} from "@/lib/server/domain/smart-views/smart-views.repository";
import {profileSmartViewSelectionSchema, profileSmartViewsSchema} from "@/lib/schemas/smart-view-profile.schema";
import {optionalMediaAuthMiddleware, requiredMediaReadMiddleware, requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";
import {smartViewDetailsSchema, smartViewIdSchema, smartViewPreviewSchema, smartViewSpecSchema, smartViewUpdateSchema} from "@/lib/schemas/smart-views.schema";


export const getSmartViews = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .handler(({ context: { currentUser } }) => {
        return smartViewsRepository.getAll(currentUser.id);
    });


export const getSmartViewEditor = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(smartViewIdSchema)
    .handler(({ data: { id }, context: { currentUser } }) => {
        return smartViewsRepository.get(currentUser.id, id);
    });


export const getSmartViewEditorFilters = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(smartViewSpecSchema.pick({ mediaTypes: true }))
    .handler(({ data: { mediaTypes }, context: { currentUser } }) => {
        return getSmartViewEditorFilterOptions(currentUser.id, mediaTypes);
    });


export const getSmartView = createServerFn({ method: "GET" })
    .middleware([optionalMediaAuthMiddleware])
    .validator(smartViewDetailsSchema)
    .handler(async ({ data: { id, page, filters }, context: { currentUser } }) => {
        const access = mcpRequestContext.getStore();
        if (access) {
            const view = smartViewsRepository.get(access.userId, id);

            return {
                isOwner: true, owner: { username: access.username },
                view, results: getSmartViewResults(access.userId, view.spec, { page, filters }),
            };
        }

        const owner = smartViewsRepository.getOwner(id);
        const isOwner = currentUser?.id === owner.id;

        if (!isOwner) {
            if (owner.profilePosition === null) {
                throw new FormattedError("Smart list not found.");
            }

            const container = await getContainer();
            const decision = await container.services.authorization.decideProfile(toActor(currentUser), owner);

            if (!decision.allowed) {
                throw new UnauthorizedError(decision.reason === DenialReason.PROFILE_RESTRICTED ? "restricted" : "private");
            }
        }

        const view = smartViewsRepository.get(owner.id, id);

        return {
            isOwner, owner: { username: owner.username },
            view, results: getSmartViewResults(owner.id, view.spec, { page, filters }),
        };
    });


export const previewSmartView = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
    .validator(smartViewPreviewSchema)
    .handler(({ data: { spec, page }, context: { currentUser } }) => {
        return getSmartViewResults(currentUser.id, spec, { page });
    });


export const previewSmartViewSummary = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(smartViewSpecSchema)
    .handler(({ data, context: { currentUser } }) => {
        return getSmartViewSummary(currentUser.id, data);
    });


export const postCreateSmartView = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(smartViewSpecSchema)
    .handler(({ data, context: { currentUser } }) => {
        return smartViewsRepository.create(currentUser.id, data);
    });


export const postUpdateSmartView = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(smartViewUpdateSchema)
    .handler(({ data: { id, spec }, context: { currentUser } }) => {
        return smartViewsRepository.update(currentUser.id, id, spec);
    });


export const postDeleteSmartView = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(smartViewIdSchema)
    .handler(({ data: { id }, context: { currentUser } }) => {
        return smartViewsRepository.delete(currentUser.id, id);
    });


export const postSetProfileSmartViews = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(profileSmartViewSelectionSchema)
    .handler(({ data: { ids }, context: { currentUser } }) => {
        return smartViewsRepository.setProfileViews(currentUser.id, ids);
    });


export const getProfileSmartViews = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(profileSmartViewsSchema)
    .handler(({ context: { user } }) => {
        if (mcpRequestContext.getStore()) {
            throw new FormattedError("Profile smart lists are available on the website.");
        }

        return smartViewsRepository.getProfileViews(user.id).map(view => ({
            ...view, preview: getSmartViewSummary(user.id, view.spec),
        }));
    });
