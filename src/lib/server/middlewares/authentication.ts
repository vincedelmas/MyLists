import {auth} from "@/lib/server/core/auth";
import {logger} from "@/lib/server/core/logger";
import {createMiddleware} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {getContainer} from "@/lib/server/core/container";
import {notFound, redirect} from "@tanstack/react-router";
import {isAtLeastRole, RoleType} from "@/lib/utils/enums";
import {isAdminAuthenticated} from "@/lib/utils/admin-token";


export const publicAuthMiddleware = createMiddleware({ type: "function" })
    .server(async ({ next }) => {
        const { headers } = getRequest();
        const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });

        const currentUser = session?.user ? { ...session.user, id: Number(session.user.id) } : undefined;
        if (currentUser) {
            void getContainer()
                .then((c) => c.account.settings.recordLastSeen(c.cacheManager, currentUser.id))
                .catch((err) => {
                    logger.warn({ err, userId: currentUser.id }, "Failed to update user last seen");
                });
        }

        return next({ context: { currentUser } });
    });


export const requiredAuthMiddleware = createMiddleware({ type: "function" })
    .middleware([publicAuthMiddleware])
    .server(async ({ next, context: { currentUser } }) => {
        if (!currentUser) {
            throw redirect({ to: "/login", search: { authExpired: true } })
        }

        return next({ context: { currentUser } });
    });


export const requiredAuthAndManagerRoleMiddleware = createMiddleware({ type: "function" })
    .middleware([requiredAuthMiddleware])
    .server(async ({ next, context: { currentUser } }) => {
        if (!isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER)) {
            throw notFound();
        }

        return next();
    });


export const requiredAuthAndAdminRoleMiddleware = createMiddleware({ type: "function" })
    .middleware([requiredAuthAndManagerRoleMiddleware])
    .server(async ({ next, context: { currentUser } }) => {
        if (!isAtLeastRole(currentUser.role as RoleType, RoleType.ADMIN)) {
            throw notFound();
        }

        return next();
    });


export const requiredAuthAndAdminTokenMiddleware = createMiddleware({ type: "function" })
    .middleware([requiredAuthAndAdminRoleMiddleware])
    .server(async ({ next, context }) => {
        if (await isAdminAuthenticated(context.currentUser.id)) {
            return next();
        }

        throw redirect({ to: "/admin" });
    });
