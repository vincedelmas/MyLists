import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {userListViewsSearchSchema} from "@/lib/schemas/lists.schema";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {getActiveMediaSettings} from "@/lib/utils/media/list-activation";
import {userCollectionsSearchSchema} from "@/lib/schemas/collections.schema";
import {publicPreviewMiddleware} from "@/lib/server/middlewares/authorization";
import {getDynamicListSummaries} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";


export const getUserListViews = createServerFn({ method: "GET" })
    .middleware([publicPreviewMiddleware])
    .validator(userListViewsSearchSchema)
    .handler(async ({ data: { search, mediaType, dynamicPage = 1 }, context: { targetUser, currentUser } }) => {
        if (mcpRequestContext.getStore()) {
            throw new FormattedError("Lists are only available on the web app.");
        }

        const container = await getContainer();
        const decision = await container.services.authorization.decideProfile(toActor(currentUser), targetUser);
        const activeSettings = getActiveMediaSettings(targetUser.userMediaSettings);
        const query = search?.trim().toLocaleLowerCase() ?? "";
        const views = decision.allowed
            ? dynamicListsRepository.getAll(targetUser.id)
                .filter(view => view.spec.title.toLocaleLowerCase().includes(query))
            : [];

        const summaries = mediaType ? getDynamicListSummaries(targetUser.id, views) : undefined;
        const matchingViews = mediaType
            ? views.filter(view => summaries!.get(view.id)!.mediaTypes.includes(mediaType))
            : views;

        const perPage = 8;
        const total = matchingViews.length;
        const pages = Math.ceil(total / perPage);
        const page = Math.max(1, Math.min(dynamicPage, pages));
        const pageViews = matchingViews.slice((page - 1) * perPage, page * perPage);
        const pageSummaries = summaries ?? getDynamicListSummaries(targetUser.id, pageViews);

        return {
            canReadTracking: decision.allowed,
            isOwner: currentUser?.id === targetUser.id,
            activeMediaTypes: activeSettings.map(({ mediaType }) => mediaType),
            presets: decision.allowed
                ? activeSettings.map(({ mediaType, totalEntries }) => ({ mediaType, totalEntries }))
                : [],
            views: pageViews.map(view => ({
                ...view,
                preview: pageSummaries.get(view.id)!,
            })),
            total,
            page,
            pages,
            perPage,
        };
    });


export const getListsCollections = createServerFn({ method: "GET" })
    .middleware([publicPreviewMiddleware])
    .validator(userCollectionsSearchSchema)
    .handler(async ({ data: { username: _username, ...filters }, context: { targetUser, currentUser } }) => {
        if (mcpRequestContext.getStore()) {
            throw new FormattedError("Collections are only available on the web app.");
        }

        const container = await getContainer();

        const actor = toActor(currentUser);
        const decision = await container.services.authorization.decideProfile(actor, targetUser);

        return container.services.collections.getPaginatedUserCollections(targetUser.id, filters, actor, !decision.allowed);
    });
