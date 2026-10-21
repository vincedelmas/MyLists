import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileAchievements} from "@/lib/server/mobile/profile";


export const Route = createFileRoute("/api/mobile/v1/profile/achievements")({
    server: {
        handlers: {
            GET: ({ request }) => {
                return mobileRequest(request, getMobileAchievements);
            }
        }
    },
});
