/**
 This file is the entry point for the server in production mode.
 It loads the TanStack Start handler and registers static file routes.
 **/

import path from "path";
import {fileURLToPath} from "bun";
import {logger} from "@/lib/server/core/logger";


const PORT = Number(process.env.PORT ?? 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_DIR = path.resolve(__dirname, "dist/client");
const SERVER_ENTRY = path.resolve(__dirname, "dist/server/server.js");

const UPLOADS_DIR_NAME = process.env.UPLOADS_DIR_NAME ?? "static";
const BASE_UPLOADS_LOCATION = process.env.BASE_UPLOADS_LOCATION ?? "./public/static/";
const UPLOADS_ROUTE = `/${UPLOADS_DIR_NAME}/*`;


let isShuttingDown = false;
let server: ReturnType<typeof Bun.serve>;


const startServer = async () => {
    logger.info({ port: PORT }, "Starting server");

    // Load TanStack Start handler
    const { default: handler } = await import(SERVER_ENTRY);
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
                    "Cache-Control": "public, max-age=31536000, immutable",
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
                const url = new URL(req.url);
                const routePrefix = `/${UPLOADS_DIR_NAME}/`;
                const relativePath = decodeURIComponent(url.pathname.slice(routePrefix.length));
                const resolvedPath = path.resolve(BASE_UPLOADS_LOCATION, relativePath);
                const uploadsRoot = path.resolve(BASE_UPLOADS_LOCATION);

                if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`) && resolvedPath !== uploadsRoot) {
                    return new Response("Not Found", { status: 404 });
                }

                const file = Bun.file(resolvedPath);
                if (!await file.exists()) {
                    return new Response("Not Found", { status: 404 });
                }

                return new Response(file, {
                    headers: {
                        "Cache-Control": "public, max-age=31536000, immutable",
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
    logger.info({ signal }, "Starting graceful shutdown");
    isShuttingDown = true;

    // Give in-flight requests time to complete
    const GRACE_PERIOD_MS = 2_000;

    await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));

    logger.info("Grace period complete, stopping server");
    void server.stop();

    logger.info("Server stopped gracefully");
    process.exit(0);
};


process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));


startServer().catch((err) => {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
})
