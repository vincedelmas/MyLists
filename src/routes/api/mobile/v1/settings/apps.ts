import {createFileRoute} from "@tanstack/react-router";
import * as z from "zod";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMcpConnections, revokeMcpConnection} from "@/lib/server/domain/mcp/mcp.repository";


export const Route = createFileRoute("/api/mobile/v1/settings/apps")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, async userId => getMcpConnections(userId)),
            POST: ({ request }) => mobileRequest(request, async userId => {
                const { clientId } = z.object({ clientId: z.string().min(1) }).parse(await request.json());
                revokeMcpConnection(userId, clientId);

                return { disconnected: true };
            }),
        }
    },
});
