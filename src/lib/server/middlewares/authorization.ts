import {notFound} from "@tanstack/react-router";
import {baseUsernameSchema, mediaTypeUsernameSchema} from "@/lib/schemas";
import {createMiddleware} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {PrivacyType, RoleType} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {decideLibraryAccess, decideMediaListAccess} from "@/lib/server/domain/access/library-access.policy";


export const resolveTargetUserMiddleware = createMiddleware({ type: "function" })
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


export const authorizationMiddleware = createMiddleware({ type: "function" })
    .middleware([resolveTargetUserMiddleware])
    .server(async ({ next, context: { targetUser, currentUser } }) => {
        const container = await getContainer();

        const needsFollowLookup = targetUser.privacy === PrivacyType.PRIVATE
            && !!currentUser
            && currentUser.id !== targetUser.id
            && currentUser.role !== RoleType.ADMIN;
        const followStatus = needsFollowLookup
            ? await container.features.socialGraphReader.getFollowingStatus(currentUser.id, targetUser.id)
            : undefined;

        const decision = decideLibraryAccess({
            actor: currentUser ? { id: currentUser.id, role: currentUser.role as RoleType } : undefined,
            owner: { id: targetUser.id, privacy: targetUser.privacy },
            followState: followStatus?.status,
        });
        if (!decision.allowed) {
            throw new UnauthorizedError(targetUser.privacy === PrivacyType.RESTRICTED ? "restricted" : "private");
        }

        return next({
            context: {
                currentUser,
                user: targetUser,
                libraryAccessScope: decision.scope,
            },
        });
    });


/**
 * Access boundary for every personal-list-derived endpoint. Public profile
 * headers and collections intentionally use different boundaries.
 */
export const mediaListAuthorizationMiddleware = createMiddleware({ type: "function" })
    .middleware([authorizationMiddleware])
    .validator(mediaTypeUsernameSchema)
    .server(async ({ next, data: { mediaType }, context }) => {
        const container = await getContainer();
        const mediaTypeEnabled = await container.features.profileChannelAccess.isEnabled(context.user.id, mediaType);
        const decision = decideMediaListAccess({
            allowed: true,
            scope: context.libraryAccessScope,
        }, mediaTypeEnabled);

        if (!decision.allowed) throw notFound();

        return next({
            context: {
                ...context,
                mediaListAccessScope: decision.scope,
            },
        });
    });
