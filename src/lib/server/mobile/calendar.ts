import type { ReleaseCalendarRange } from "@/lib/schemas/release-calendar.schema";
import { releaseCalendarMediaTypeSchema } from "@/lib/schemas/release-calendar.schema";
import { getContainer } from "@/lib/server/core/container";
import { getActiveMediaTypes } from "@/lib/utils/media/list-activation";
import { getImageUrl } from "@/lib/server/core/images/image-url";
import { getServerMediaDefinition } from "@/lib/media-definitions/definition.registry.server";
import { mobileImagePath } from "./images";

export const getMobileCalendar = async (userId: number, range: ReleaseCalendarRange) => {
    const { services, registries } = await getContainer();
    const settings = await services.account.getMinimalUserSettings(userId);
    const active = getActiveMediaTypes(settings);
    const mediaTypes = releaseCalendarMediaTypeSchema.options.filter((type) => active.includes(type));
    const releases = await Promise.all(
        mediaTypes.map((type) => registries.mediaService.get(type).getReleaseCalendarMedia(userId, range)),
    );

    return {
        mediaTypes,
        items: releases
            .flat()
            .map((item) => ({
                ...item,
                cover: mobileImagePath(
                    getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, item.imageCover),
                ),
            }))
            .sort((a, b) => a.date.localeCompare(b.date) || a.mediaName.localeCompare(b.mediaName)),
    };
};
