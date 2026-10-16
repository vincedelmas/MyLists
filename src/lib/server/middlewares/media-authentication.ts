import {clientEnv} from "@/env/client";
import {RoleType} from "@/lib/utils/enums";
import {redirect} from "@tanstack/react-router";
import {createMiddleware} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {FormattedError} from "@/lib/utils/error-classes";
import {getSafeRedirectPath} from "@/lib/utils/redirects";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";


// Only functions using these middlewares accept MCP identity
export const optionalMediaAuthMiddleware = createMiddleware({ type: "function" })
    .middleware([publicAuthMiddleware])
    .server(({ next, context }) => {
        const access = mcpRequestContext.getStore();

        if (access && !access.scopes.has(MCP_READ_SCOPE)) {
            throw new FormattedError("This connection does not have permission to read media.");
        }

        // An assistant acts with user's normal permissions, even for admins
        const currentUser = access
            ? { id: access.userId, role: RoleType.USER }
            : context.currentUser;

        return next({ context: { currentUser } });
    });


export const requiredMediaReadMiddleware = createMiddleware({ type: "function" })
    .middleware([optionalMediaAuthMiddleware])
    .server(({ next, context: { currentUser } }) => {
        if (!currentUser) {
            const referer = getRequest().headers.get("referer");
            const redirectTarget = getSafeRedirectPath(referer, clientEnv.VITE_BASE_URL);

            throw redirect({
                to: "/login",
                search: { authExpired: true, redirect: redirectTarget },
            });
        }

        return next({ context: { currentUser } });
    });


export const requiredMediaWriteMiddleware = createMiddleware({ type: "function" })
    .middleware([requiredMediaReadMiddleware])
    .server(({ next }) => {
        const access = mcpRequestContext.getStore();

        if (access && !access.scopes.has(MCP_WRITE_SCOPE)) {
            throw new FormattedError("This connection does not have permission to modify media.");
        }

        return next();
    });
