import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileTrends} from "@/lib/server/mobile/community";

export const Route = createFileRoute("/api/mobile/v1/trends")({
    server: { handlers: { GET: ({ request }) => mobileRequest(request, getMobileTrends) } },
});
