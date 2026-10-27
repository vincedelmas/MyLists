import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileLibrary, librarySearchSchema} from "@/lib/server/mobile/library";
import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";


export const Route = createFileRoute("/api/mobile/v1/library/")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    getMobileLibrary(
                        await resolveMobileProfileUser(request, userId),
                        librarySearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
                        userId,
                    ),
                ),
        },
    },
});
