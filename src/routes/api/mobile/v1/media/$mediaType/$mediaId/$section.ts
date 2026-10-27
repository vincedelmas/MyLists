import {actOnMobileMedia, getMobileMediaHistory, getMobileMediaTags, mobileMediaActionSchema} from "@/lib/server/mobile/media-personal";
import * as z from "zod";
import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {mediaParamsSchema} from "@/lib/server/mobile/media";
import {coercedPositiveIntFieldSchema} from "@/lib/schemas/common.schema";
import {editMediaDetailsSchema} from "@/lib/schemas/media-details.schema";
import {
    checkMobileGameHltb,
    getMobileMediaDetails,
    getMobileMediaCommunity,
    getMobileMediaCollections,
    getMobileMediaEdit,
    saveMobileMediaEdit,
    refreshMobileMedia,
} from "@/lib/server/mobile/media-sections";

export const Route = createFileRoute("/api/mobile/v1/media/$mediaType/$mediaId/$section")({
    server: {
        handlers: {
            GET: ({ request, params }) =>
                mobileRequest(request, async (userId) => {
                    const media = mediaParamsSchema.parse(params);
                    const section = z.enum(["details", "community", "collections", "edit", "history", "tags"]).parse(params.section);
                    switch (section) {
                        case "history":
                            return getMobileMediaHistory(userId, media, coercedPositiveIntFieldSchema.parse(new URL(request.url).searchParams.get("page") ?? 1));
                        case "tags":
                            return getMobileMediaTags(userId, media);
                        case "details":
                            return getMobileMediaDetails(userId, media);
                        case "community":
                            return getMobileMediaCommunity(
                                userId,
                                media,
                                coercedPositiveIntFieldSchema.parse(new URL(request.url).searchParams.get("page") ?? 1),
                                new URL(request.url).searchParams.get("search") ?? undefined,
                            );
                        case "collections":
                            return getMobileMediaCollections(userId, media);
                        case "edit":
                            return getMobileMediaEdit(userId, media);
                    }
                }),
            POST: ({ request, params }) =>
                mobileRequest(request, async (userId) => {
                    const media = mediaParamsSchema.parse(params);
                    const section = z.enum(["edit", "refresh", "personal", "hltb"]).parse(params.section);
                    if (section === "personal") return actOnMobileMedia(userId, media, mobileMediaActionSchema.parse(await request.json()));
                    if (section === "hltb") return checkMobileGameHltb(userId, media);
                    return section === "refresh"
                        ? refreshMobileMedia(userId, media)
                        : saveMobileMediaEdit(
                            userId,
                            editMediaDetailsSchema.parse({ ...(await request.json()), ...media }),
                        );
                }),
        },
    },
});
