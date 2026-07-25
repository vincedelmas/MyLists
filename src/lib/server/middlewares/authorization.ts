import {DenialReason} from "@/lib/utils/enums";
import {notFound} from "@tanstack/react-router";
import {baseUsernameSchema} from "@/lib/schemas";
import {toActor} from "@/lib/server/authorization";
import {createMiddleware} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


/**
 * Resolves profile and media-list headers preview data.
 * This middleware does not grant access to profile or list content.
 */
export const publicPreviewMiddleware = createMiddleware({ type: "function" })
    .middleware([publicAuthMiddleware])
    .validator((data) => {
        const result = baseUsernameSchema.safeParse(data);
        if (!result.success) throw notFound();
        return result.data;
    })
    .server(async ({ next, data: { username }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        const targetUser = await userService.getUserByUsername(username);
        if (!targetUser) throw notFound();

        return next({
            context: {
                targetUser,
                currentUser,
            }
        });
    });


export const contentAuthorizationMiddleware = createMiddleware({ type: "function" })
    .middleware([publicPreviewMiddleware])
    .server(async ({ next, context: { targetUser, currentUser } }) => {
        const container = await getContainer();
        const authorizationService = container.services.authorization;

        const decision = await authorizationService.decideProfile(toActor(currentUser), targetUser);
        if (!decision.allowed) {
            throw new UnauthorizedError(decision.reason === DenialReason.PROFILE_RESTRICTED ? "restricted" : "private");
        }

        return next({
            context: {
                currentUser,
                user: targetUser,
            },
        });
    });
