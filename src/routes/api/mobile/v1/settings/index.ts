import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileSettings, saveMobileSettings, settingsInputSchema} from "@/lib/server/mobile/settings";


export const Route = createFileRoute("/api/mobile/v1/settings/")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, getMobileSettings),
            PATCH: ({ request }) =>
                mobileRequest(request, async (userId) =>
                    saveMobileSettings(userId, settingsInputSchema.parse(await request.json())),
                ),
        },
    },
});
