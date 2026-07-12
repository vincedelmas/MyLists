import {logCsrfFailureServer} from "@/lib/server/core/csrf-logger.server";
import {createCsrfMiddleware, createServerOnlyFn} from "@tanstack/react-start";


const logCsrfFailure = createServerOnlyFn((request: Request) => {
    logCsrfFailureServer(request);
});


export const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === "serverFn",
    origin: (origin, ctx) => {
        /**
         * Necessary for old (safari) browsers that only send `Referer` and not `Sec-Fetch-Site` or `Origin` (on GET at least),
         * but because the app is behind http nginx proxy (https handled by cloudflare) then orgin is http instead of https
         * and so csrf middleware returns 403 Forbidden. For newer browsers that then `Sec-Fetch-Site` no problems.
         * Necessary to add:
         *
         *      proxy_set_header X-Forwarded-Host $host;
         *      proxy_set_header X-Forwarded-Proto https;
         *
         * in the nginx conf file. If not using Cloudflare but nginx with certbot locally, (so https is handled by nginx) this
         * is normally not needed.
         */

        const forwardedProto = ctx.request.headers.get("X-Forwarded-Proto");
        const forwardedHost = ctx.request.headers.get("X-Forwarded-Host") ?? ctx.request.headers.get("Host");

        if (forwardedProto && forwardedHost) {
            return origin === `${forwardedProto}://${forwardedHost}`;
        }

        return origin === new URL(ctx.request.url).origin;
    },
    failureResponse: (ctx) => {
        logCsrfFailure(ctx.request);
        return new Response("Forbidden", { status: 403 });
    },
});
