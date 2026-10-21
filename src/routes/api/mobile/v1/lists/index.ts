import {createFileRoute} from "@tanstack/react-router";
import {getMobileLists} from "@/lib/server/mobile/media";
import {mobileRequest} from "@/lib/server/mobile/request";


export const Route = createFileRoute("/api/mobile/v1/lists/")({
    server: {
        handlers: {
            GET: ({ request }) => {
                return mobileRequest(request, getMobileLists);
            }
        }
    },
});
