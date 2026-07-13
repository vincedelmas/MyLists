import {logCsrfFailureServer} from "@/lib/server/core/csrf-logger.server";
import {createCsrfMiddleware, createServerOnlyFn} from "@tanstack/react-start";


const logCsrfFailure = createServerOnlyFn((request: Request) => {
    logCsrfFailureServer(request);
});


export const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === "serverFn",
    origin: "https://mylists.info",
    failureResponse: (ctx) => {
        logCsrfFailure(ctx.request);
        return new Response("Forbidden", { status: 403 });
    },
});
