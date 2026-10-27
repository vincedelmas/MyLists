import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileGameSearchOptions} from "@/lib/server/mobile/search";

export const Route = createFileRoute("/api/mobile/v1/search-options")({ server: { handlers: { GET: ({ request }) => mobileRequest(request, getMobileGameSearchOptions) } } });
