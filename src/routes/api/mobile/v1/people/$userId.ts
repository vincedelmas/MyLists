import { createFileRoute } from "@tanstack/react-router";
import { coercedPositiveIntFieldSchema } from "@/lib/schemas/common.schema";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobilePerson } from "@/lib/server/mobile/people";

export const Route = createFileRoute("/api/mobile/v1/people/$userId")({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                mobileRequest(request, (viewerId) =>
                    getMobilePerson(viewerId, coercedPositiveIntFieldSchema.parse(params.userId)),
                ),
        },
    },
});
