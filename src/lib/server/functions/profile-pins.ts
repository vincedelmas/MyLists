import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {profilePinSchema, profilePinsSchema} from "@/lib/schemas/profile-pins.schema";
import {profilePinsRepository} from "@/lib/server/domain/profile/profile-pins.repository";
import {getDynamicListSummaries} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";


export const getOwnProfilePins = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(({ context: { currentUser } }) => profilePinsRepository.getOwn(currentUser.id));


export const postSetProfilePin = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(profilePinSchema)
    .handler(({ data: { pinned, ...item }, context: { currentUser } }) => {
        profilePinsRepository.set(currentUser.id, item, pinned);
    });


export const getProfilePins = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(profilePinsSchema)
    .handler(async ({ context: { user, currentUser } }) => {
        if (mcpRequestContext.getStore()) {
            throw new FormattedError("Profile pins are available on the website.");
        }

        const container = await getContainer();
        const collections = await container.services.collections.getUserCollections(user.id, toActor(currentUser), undefined, true);

        const views = dynamicListsRepository.getPinned(user.id);
        const summaries = getDynamicListSummaries(user.id, views, { includeCovers: false });

        const dynamic = views.map(view => ({
            view,
            kind: "dynamic" as const,
            position: view.profilePosition!,
            preview: { total: summaries.get(view.id)!.total },
        }));

        return {
            activeMediaTypes: getActiveMediaTypes(user.userMediaSettings),
            items: [...dynamic, ...collections.map(collection => ({
                kind: "collection" as const,
                position: collection.profilePosition!,
                collection,
            }))].sort((a, b) => a.position - b.position),
        };
    });
