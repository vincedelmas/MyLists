import {logger} from "@/lib/server/core/logger";


export function logCsrfFailureServer(request: Request) {
    const requestUrl = new URL(request.url);

    logger.warn(
        {
            method: request.method,
            pathname: requestUrl.pathname,
            requestOrigin: requestUrl.origin,
            host: request.headers.get("Host"),
            origin: request.headers.get("Origin"),
            referer: request.headers.get("Referer"),
            userAgent: request.headers.get("User-Agent"),
            secFetchSite: request.headers.get("Sec-Fetch-Site"),
            forwardedHost: request.headers.get("X-Forwarded-Host"),
            forwardedProto: request.headers.get("X-Forwarded-Proto"),
        },
        "CSRF validation failed",
    );
}
