import {createCsrfMiddleware, createStart} from "@tanstack/react-start";
import {funcErrorMiddleware, reqErrorMiddleware} from "@/lib/server/middlewares/global-error";
import {formattedErrorAdapter, formZodErrorAdapter, unauthorizedErrorAdapter} from "@/lib/utils/error-classes";


const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === "serverFn",
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
            unauthorizedErrorAdapter,
        ],
    }
});
