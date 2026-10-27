import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileMoviedle, guessMobileMoviedle, moviedleGuessSchema} from "@/lib/server/mobile/moviedle";


export const Route = createFileRoute("/api/mobile/v1/moviedle/")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, getMobileMoviedle),
            POST: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    guessMobileMoviedle(userId, moviedleGuessSchema.parse(await request.json())),
                ),
        },
    },
});
