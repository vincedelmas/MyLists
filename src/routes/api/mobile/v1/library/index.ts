import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileLibrary, librarySearchSchema} from "@/lib/server/mobile/library";
export const Route = createFileRoute("/api/mobile/v1/library/")({
    server: {
        handlers: {
            GET: ({request}) =>
                mobileRequest(request, (userId) =>
                    getMobileLibrary(
                        userId,
                        librarySearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                    ),
                ),
        },
    },
});
