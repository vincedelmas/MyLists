import {createCsrfMiddleware, createStart} from "@tanstack/react-start";
import {funcErrorMiddleware, reqErrorMiddleware} from "@/lib/server/middlewares/global-error";
import {formattedErrorAdapter, formZodErrorAdapter, unauthorizedErrorAdapter, validationErrorAdapter} from "@/lib/utils/error-classes";


const csrfMiddleware = createCsrfMiddleware({
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
        const requestUrl = new URL(ctx.request.url);

        console.warn("CSRF validation failed", {
            method: ctx.request.method,
            pathname: requestUrl.pathname,
            requestOrigin: requestUrl.origin,
            host: ctx.request.headers.get("Host"),
            forwardedHost: ctx.request.headers.get("X-Forwarded-Host"),
            forwardedProto: ctx.request.headers.get("X-Forwarded-Proto"),
            secFetchSite: ctx.request.headers.get("Sec-Fetch-Site"),
            origin: ctx.request.headers.get("Origin"),
            referer: ctx.request.headers.get("Referer"),
            userAgent: ctx.request.headers.get("User-Agent"),
        });

        return new Response("Forbidden", { status: 403 });
    },
});


export const startInstance = createStart(() => {
    return {
        defaultSsr: false,
        requestMiddleware: [csrfMiddleware, reqErrorMiddleware],
        functionMiddleware: [funcErrorMiddleware],
        serializationAdapters: [
            formZodErrorAdapter,
            formattedErrorAdapter,
            validationErrorAdapter,
            unauthorizedErrorAdapter,
        ],
    }
});
