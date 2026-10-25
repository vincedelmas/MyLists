import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {FormattedError} from "@/lib/utils/error-classes";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {profilePinSchema, profilePinsSchema} from "@/lib/schemas/profile-pins.schema";
import {profilePinsRepository} from "@/lib/server/domain/profile/profile-pins.repository";
import {getProfilePinnedItems} from "@/lib/server/domain/profile/profile-pins.queries";


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

        return {
            activeMediaTypes: getActiveMediaTypes(user.userMediaSettings),
            items: await getProfilePinnedItems(user.id, toActor(currentUser)),
        };
    });
