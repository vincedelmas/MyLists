import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileMoviedleLeaderboard} from "@/lib/server/mobile/moviedle";


export const Route = createFileRoute("/api/mobile/v1/moviedle/leaderboard")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, getMobileMoviedleLeaderboard),
        },
    },
});
