import * as z from "zod";
import {notFound} from "@tanstack/react-router";
import {getContainer} from "@/lib/server/core/container";
import {mobileImagePath} from "@/lib/server/mobile/images";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {mediaListSearchSchema} from "@/lib/schemas/media-lists.schema";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {MediaListDataByType} from "@/lib/server/domain/media/media-list.types";
import {addMediaToListSchema, updateUserMediaSchema} from "@/lib/schemas/user-media.schema";
import {mediaTypeFieldSchema, coercedPositiveIntFieldSchema} from "@/lib/schemas/common.schema";
import {ActivityCorrectionRequired} from "@/lib/server/domain/tracking/monthly-activity.service";


export const mediaParamsSchema = z.object({ mediaType: mediaTypeFieldSchema, mediaId: coercedPositiveIntFieldSchema });


export const listInputSchema = mediaListSearchSchema.pick({ page: true, search: true, sorting: true }).extend({
    status: z.string().optional(),
    favorite: z.enum(["true", "false"]).optional(),
});


export const getMobileList = async (userId: number, mediaType: z.infer<typeof mediaTypeFieldSchema>, input: z.infer<typeof listInputSchema>) => {
    const container = await getContainer();
    const definition = getMediaDefinition(mediaType);
    const user = await container.services.account.getUserById(userId);

    if (!user?.userMediaSettings.some((setting) => setting.active && setting.mediaType === mediaType))
        throw new InactiveMediaTypeError(mediaType);

    const status = input.status ? z.enum(definition.statuses).parse(input.status) : undefined;
    const result = (await container.registries.mediaService.get(mediaType).getMediaList(userId, userId, {
        ...input,
        perPage: 30,
        favorite: input.favorite === "true",
        status: status ? [status] : undefined,
    })) as MediaListDataByType[typeof mediaType];

    return {
        pagination: result.pagination,
        statuses: definition.statuses,
        ratingSystem: user.ratingSystem,
        items: result.items.map((item) => ({
            status: item.status,
            rating: item.rating,
            name: item.mediaName,
            mediaId: item.mediaId,
            favorite: item.favorite,
            cover: mobileImagePath(item.imageCover),
        })),
    };
};


export const getMobileMedia = async (userId: number, params: z.infer<typeof mediaParamsSchema>) => {
    const container = await getContainer();
    const definition = getMediaDefinition(params.mediaType);
    const service = container.registries.mediaService.get(params.mediaType);

    const media = service.findById(params.mediaId);
    if (!media) throw notFound();

    const userMedia = service.findUserMedia(userId, params.mediaId) as Awaited<ReturnType<typeof service.getMediaAndUserDetails>>["userMedia"];
    const settings = await container.services.account.getUserById(userId);

    const compatiblePlatforms =
        params.mediaType === "games"
            ? await container.registries.mediaService.get("games").getCompatiblePlatforms(params.mediaId)
            : [];

    return {
        compatiblePlatforms,
        statuses: definition.statuses,
        progress: definition.progress,
        ratingSystem: settings!.ratingSystem,
        active: settings?.userMediaSettings.some((setting) => setting.mediaType === params.mediaType && setting.active) ?? false,
        seasons:
            params.mediaType === "series" || params.mediaType === "anime"
                ? container.registries.mediaService.get(params.mediaType).getUserSeasons(userId, params.mediaId)
                : null,
        media: {
            id: media.id,
            name: media.name,
            synopsis: media.synopsis,
            releaseDate: media.releaseDate,
            cover: mobileImagePath(userMedia?.customCover ?? media.imageCover),
        },
        tracking: userMedia
            ? {
                ...userMedia,
                customCover: userMedia.customCover ? mobileImagePath(userMedia.customCover) : null,
                addedAt: userMedia.addedAt ? dateFromUTCInput(userMedia.addedAt).toISOString() : null,
                lastUpdated: userMedia.lastUpdated ? dateFromUTCInput(userMedia.lastUpdated).toISOString() : null,
            }
            : null,
    };
};


export const addMobileMedia = async (userId: number, input: z.infer<typeof addMediaToListSchema>) => {
    const { services } = await getContainer();
    services.mediaTracking.addMediaToList({ ...input, userId });

    return { kind: "saved" as const };
};


export const updateMobileMedia = async (userId: number, input: z.infer<typeof updateUserMediaSchema>) => {
    const { services } = await getContainer();

    try {
        services.mediaTracking.updateUserMedia({ ...input, userId });
        return { kind: "saved" as const };
    }
    catch (error) {
        if (error instanceof ActivityCorrectionRequired)
            return { kind: "correction-required" as const, preview: error.preview };
        throw error;
    }
};


export const removeMobileMedia = async (userId: number, params: z.infer<typeof mediaParamsSchema>) => {
    const { services } = await getContainer();
    services.mediaTracking.removeMediaFromList({ ...params, userId });

    return { kind: "saved" as const };
};


export const getMobileLists = async (userId: number) => {
    const { services } = await getContainer();

    const user = await services.account.getUserById(userId);
    if (!user) return null;

    return user.userMediaSettings
        .filter((item) => item.active)
        .map(({ mediaType, totalEntries, entriesFavorites, timeSpent }) => ({
            mediaType,
            totalEntries,
            entriesFavorites,
            timeSpent: timeSpent / 60,
        }));
};
