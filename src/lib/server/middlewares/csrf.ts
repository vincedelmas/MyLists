import {logCsrfFailureServer} from "@/lib/server/core/csrf-logger.server";
import {createCsrfMiddleware, createServerOnlyFn} from "@tanstack/react-start";
import {clientEnv} from "@/env/client";


const logCsrfFailure = createServerOnlyFn((request: Request) => {
    logCsrfFailureServer(request);
});


export const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === "serverFn",
    origin: new URL(clientEnv.VITE_BASE_URL).origin,
    failureResponse: (ctx) => {
        logCsrfFailure(ctx.request);
        return new Response("Forbidden", { status: 403 });
    },
});
