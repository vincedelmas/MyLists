import {auth} from "@/lib/server/core/auth";
import {createFileRoute} from "@tanstack/react-router";


// OAuth/MCP discovery is outside /api/auth; Better Auth owns its responses
export const Route = createFileRoute("/.well-known/$")({
    server: {
        handlers: {
            GET: ({ request }) => auth.handler(request),
            HEAD: ({ request }) => auth.handler(request),
        },
    },
});
