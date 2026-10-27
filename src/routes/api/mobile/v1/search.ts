import {clientEnv} from "@/env/client";
import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {mobileImagePath} from "@/lib/server/mobile/images";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {searchCatalog} from "@/lib/server/domain/search/catalog-search";


export const Route = createFileRoute("/api/mobile/v1/search")({
    server: {
        handlers: {
            GET: ({ request }) =>
                mobileRequest(request, async (userId) => {
                    const result = await searchCatalog(
                        navbarSearchSchema.parse({
                            ...Object.fromEntries(new URL(request.url).searchParams),
                            advancedFilters: new URL(request.url).searchParams.has("advancedFilters")
                                ? JSON.parse(new URL(request.url).searchParams.get("advancedFilters")!)
                                : undefined
                        }),
                        userId,
                    );

                    return {
                        ...result,
                        data: result.data.map((item) => ({
                            ...item,
                            image:
                                new URL(item.image, clientEnv.VITE_BASE_URL).origin ===
                                new URL(clientEnv.VITE_BASE_URL).origin
                                    ? mobileImagePath(item.image)
                                    : item.image,
                        })),
                    };
                }),
        },
    },
});
