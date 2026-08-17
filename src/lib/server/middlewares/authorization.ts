import {notFound} from "@tanstack/react-router";
import {baseUsernameSchema} from "@/lib/schemas";
import {toActor} from "@/lib/server/authorization";
import {createMiddleware} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {DenialReason, MediaType} from "@/lib/utils/enums";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


type MediaListRequest = {
    username: string;
    mediaType: MediaType;
};


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
        const accountService = container.services.account;

        const targetUser = await accountService.getUserByUsername(username);
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


/**
 * Resolves a public list-header preview only when owner has published requested media list.
 */
export const activeMediaListPreviewMiddleware = createMiddleware({ type: "function" })
    .middleware([publicPreviewMiddleware])
    .server(async ({ next, data, context: { targetUser, currentUser } }) => {
        const { mediaType } = data as MediaListRequest;
        if (!resolveMediaTypeActive(targetUser.userMediaSettings, mediaType)) {
            throw notFound();
        }

        return next({
            context: {
                targetUser,
                currentUser,
            },
        });
    });


/**
 * Applies profile authorization and activated-list publication boundary
 * before any list-derived data is loaded.
 */
export const activeMediaListAuthorizationMiddleware = createMiddleware({ type: "function" })
    .middleware([contentAuthorizationMiddleware])
    .server(async ({ next, data, context: { user, currentUser } }) => {
        const { mediaType } = data as MediaListRequest;
        if (!resolveMediaTypeActive(user.userMediaSettings, mediaType)) {
            throw notFound();
        }

        return next({
            context: {
                user,
                currentUser,
            },
        });
    });
