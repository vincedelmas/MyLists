import {createFileRoute} from "@tanstack/react-router";
import {externalMediaResolveSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {mobileRequest} from "@/lib/server/mobile/request";

export const Route = createFileRoute("/api/mobile/v1/resolve")({
    server: {
        handlers: {
            POST: ({ request }) =>
                mobileRequest(request, async () => {
                    const { mediaType, apiId } = externalMediaResolveSchema.parse(await request.json());
                    const container = await getContainer();
                    return {
                        mediaId: await container.registries.ingestionServices.get(mediaType).storeFromExternal(apiId),
                    };
                }),
        },
    },
});
