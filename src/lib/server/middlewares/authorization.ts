import {notFound} from "@tanstack/react-router";
import {baseUsernameSchema} from "@/lib/schemas";
import {tryNotFound} from "@/lib/utils/try-not-found";
import {createMiddleware} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const resolveTargetUserMiddleware = createMiddleware({ type: "function" })
    .middleware([publicAuthMiddleware])
    .inputValidator(tryNotFound(baseUsernameSchema))
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


export const authorizationMiddleware = createMiddleware({ type: "function" })
    .middleware([resolveTargetUserMiddleware])
    .server(async ({ next, context: { targetUser, currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        // Guard non-authed access to non-public pages
        if (!currentUser && targetUser.privacy !== PrivacyType.PUBLIC) {
            throw new UnauthorizedError(targetUser.privacy === PrivacyType.RESTRICTED ? "restricted" : "private");
        }

        // Guard private pages access requirements
        if (targetUser.privacy === PrivacyType.PRIVATE && currentUser?.id !== targetUser.id && currentUser?.role !== RoleType.ADMIN) {
            const followStatus = await userService.getFollowingStatus(currentUser!.id, targetUser.id);
            if (followStatus?.status !== SocialState.ACCEPTED) {
                throw new UnauthorizedError("private");
            }
        }

        return next({
            context: {
                currentUser,
                user: targetUser,
            },
        });
    });
