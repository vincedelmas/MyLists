import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileJob, mobileJobSchema} from "@/lib/server/mobile/media-sections";

export const Route = createFileRoute("/api/mobile/v1/catalog-job")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, userId => getMobileJob(userId, mobileJobSchema.parse(Object.fromEntries(new URL(request.url).searchParams)))),
        }
    }
});
