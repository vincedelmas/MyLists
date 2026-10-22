import { createFileRoute } from "@tanstack/react-router";
import { mobileRequest } from "@/lib/server/mobile/request";
import { getMobileMoviedleSuggestions } from "@/lib/server/mobile/moviedle";
import { mediadleSuggestionsSchema } from "@/lib/schemas/mediadle.schema";

export const Route = createFileRoute("/api/mobile/v1/moviedle/suggestions")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async () => {
                    const { query } = mediadleSuggestionsSchema.parse(
                        Object.fromEntries(new URL(request.url).searchParams),
                    );
                    return getMobileMoviedleSuggestions(query);
                }),
        },
    },
});
