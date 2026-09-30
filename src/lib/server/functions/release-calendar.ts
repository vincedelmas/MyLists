import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {releaseCalendarMediaTypeSchema, releaseCalendarRangeSchema} from "@/lib/schemas/release-calendar.schema";


export const getReleaseCalendarMedia = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(releaseCalendarRangeSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const settings = await container.services.account.getMinimalUserSettings(currentUser.id);
        const activeMediaTypes = new Set(settings.filter(({ active }) => active).map(({ mediaType }) => mediaType));

        const mediaTypes = releaseCalendarMediaTypeSchema.options.filter(type => activeMediaTypes.has(type));
        const releases = await Promise.all(mediaTypes.map(mediaType =>
            container.registries.mediaService.get(mediaType).getReleaseCalendarMedia(currentUser.id, data),
        ));

        return {
            mediaTypes,
            items: releases.flat(),
        };
    });
