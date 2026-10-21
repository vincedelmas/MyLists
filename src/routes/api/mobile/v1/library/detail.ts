import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileLibraryDetail, libraryDetailSchema} from "@/lib/server/mobile/library";
export const Route = createFileRoute("/api/mobile/v1/library/detail")({
    server: {
        handlers: {
            GET: ({request}) =>
                mobileRequest(request, (userId) =>
                    getMobileLibraryDetail(
                        userId,
                        libraryDetailSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                    ),
                ),
        },
    },
});
