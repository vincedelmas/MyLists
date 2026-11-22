/**
 This file is the entry point for the server in production mode.
 It loads the TanStack Start handler and registers static file routes.
 **/

import path from "path";
import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {getStaticCacheControl} from "@/lib/server/core/static-cache-control";
import {installProcessErrorHandlers} from "@/lib/server/core/process-errors";


installProcessErrorHandlers();


const DIST_DIR = import.meta.dir;
const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIR = path.resolve(DIST_DIR, "client");
const SERVER_ENTRY = path.resolve(DIST_DIR, "server/server.js");

const UPLOADS_DIR_NAME = serverEnv.UPLOADS_DIR_NAME ?? "static";
const BASE_UPLOADS_LOCATION = serverEnv.BASE_UPLOADS_LOCATION ?? "./public/static/";
const UPLOADS_ROUTE = `/${UPLOADS_DIR_NAME}/*`;


let isShuttingDown = false;
let server: ReturnType<typeof Bun.serve> | undefined;
let closeResources: (() => Promise<void>) | undefined;


const startServer = async () => {
    logger.info({ port: PORT }, "Starting server");

    // Load TanStack Start handler
    const { default: handler } = await import(SERVER_ENTRY);

    closeResources = handler.closeResources;
    logger.info("TanStack Start handler loaded");

    // Scan and register static file routes at startup
    const glob = new Bun.Glob("**/*");
    const routes: Record<string, () => Response> = {};

    for await (const relativePath of glob.scan({ cwd: CLIENT_DIR })) {
        const filepath = path.join(CLIENT_DIR, relativePath);
        const route = `/${relativePath.split(path.sep).join(path.posix.sep)}`;

        // Create route handler that serves file on-demand
        routes[route] = () => {
            const file = Bun.file(filepath);
            return new Response(file, {
                headers: {
                    "Cache-Control": getStaticCacheControl(route),
                    "Content-Type": file.type || "application/octet-stream",
                },
            })
        }
    }

    logger.info({ count: Object.keys(routes).length }, "Registered static routes");

    // Start Bun server
    server = Bun.serve({
        port: PORT,
        routes: {
            ...routes,
            [UPLOADS_ROUTE]: async (req: Request) => {
                let relativePath: string;
                const url = new URL(req.url);
                const routePrefix = `/${UPLOADS_DIR_NAME}/`;

                try {
                    relativePath = decodeURIComponent(url.pathname.slice(routePrefix.length));
                }
                catch {
                    return new Response("Bad Request", { status: 400 });
                }

                const uploadsRoot = path.resolve(BASE_UPLOADS_LOCATION);
                const resolvedPath = path.resolve(BASE_UPLOADS_LOCATION, relativePath);

                if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`) && resolvedPath !== uploadsRoot) {
                    return new Response("Not Found", { status: 404 });
                }

                const file = Bun.file(resolvedPath);
                if (!await file.exists()) {
                    return new Response("Not Found", { status: 404 });
                }

                return new Response(file, {
                    headers: {
                        "Cache-Control": getStaticCacheControl(relativePath),
                        "Content-Type": file.type || "application/octet-stream",
                    },
                });
            },
            "/*": (req: Request) => {
                // Reject new requests during shutdown
                if (isShuttingDown) {
                    return new Response("Service Unavailable", { status: 503, headers: { "Retry-After": "5" } });
                }
                return handler.fetch(req);
            },
        },
        error(err) {
            logger.error({ err }, "Bun server error");
            return new Response("Internal Server Error", { status: 500 });
        },
    })

    logger.info({ port: server.port, url: `http://localhost:${server.port}` }, "Server running");
};


// Graceful shutdown handler
const shutdown = async (signal: string) => {
    if (isShuttingDown) return;

    logger.info({ signal }, "Starting graceful shutdown");
    isShuttingDown = true;

    // Keep this deadline below deployment platform stop timeout
    const shutdownTimeout = setTimeout(() => {
        logger.error("Graceful shutdown timed out after 30 seconds, forcing exit");
        process.exit(1);
    }, 30_000);

    try {
        // Stop accepting connections immediately and wait for active requests to finish.
        await server?.stop();
        await closeResources?.();
    }
    catch (err) {
        logger.error({ err }, "Failed to shutdown gracefully");
        process.exit(1);
    }

    clearTimeout(shutdownTimeout);
    logger.info("Server stopped gracefully");
    process.exit(0);
};


process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));


startServer().catch((err) => {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
})
