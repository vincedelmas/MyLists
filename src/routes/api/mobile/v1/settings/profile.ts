import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileProfileSettings} from "@/lib/server/mobile/settings";


export const Route = createFileRoute("/api/mobile/v1/settings/profile")({
    server: { handlers: { GET: ({ request }) => mobileRequest(request, getMobileProfileSettings) } },
});
