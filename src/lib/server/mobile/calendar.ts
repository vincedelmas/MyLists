import {mobileImagePath} from "./images";
import {getContainer} from "@/lib/server/core/container";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import type {ReleaseCalendarRange} from "@/lib/schemas/release-calendar.schema";
import {releaseCalendarMediaTypeSchema} from "@/lib/schemas/release-calendar.schema";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


export const getMobileCalendar = async (userId: number, range: ReleaseCalendarRange, viewerId = userId) => {
    if (viewerId !== userId) {
        throw new UnauthorizedError("private");
    }

    const { services, registries } = await getContainer();
    const settings = await services.account.getMinimalUserSettings(userId);

    const active = getActiveMediaTypes(settings);
    const mediaTypes = releaseCalendarMediaTypeSchema.options.filter((type) => active.includes(type));
    const releases = await Promise.all(mediaTypes.map((mt) => registries.mediaService.get(mt).getReleaseCalendarMedia(userId, range)));

    return {
        mediaTypes,
        items: releases
            .flat()
            .map((item) => ({
                ...item,
                cover: mobileImagePath(
                    getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, item.imageCover),
                ),
            })).sort((a, b) => a.date.localeCompare(b.date) || a.mediaName.localeCompare(b.mediaName)),
    };
};
