import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {createBookSchema, updateUserBookDetailsSchema} from "@/lib/schemas/books.schema";
import {requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";


export const postCreateBook = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(createBookSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.mediaTracking.createManualBook(currentUser.id, data);
    });


export const postUpdateUserBookDetails = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(updateUserBookDetailsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.mediaTracking.updateUserBookCustomDetails(currentUser.id, data);
    });
