import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {getContinueItems} from "@/lib/server/domain/continue/continue.repository";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {mediaTypeFieldSchema, mediaTypeMediaIdSchema} from "@/lib/schemas/common.schema";


export const getContinueMedia = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .handler(async ({ context: { user } }) => {
        const mediaTypes = getActiveMediaTypes(user.userMediaSettings).filter(mediaType => mediaType !== MediaType.MOVIES);

        return {
            mediaTypes,
            items: await getContinueItems(user.id, mediaTypes),
        };
    });


export const postContinueMedia = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema.extend({ mediaType: mediaTypeFieldSchema.exclude(["MOVIES"]) }))
    .handler(async ({ data, context: { currentUser } }) => {
        const tracking = await getContainer().then(container => container.services.mediaTracking);
        return tracking.continueUserMedia({ ...data, userId: currentUser.id });
    });
