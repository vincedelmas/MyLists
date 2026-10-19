import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {createBookSchema} from "@/lib/schemas/books.schema";
import {requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";


export const postCreateBook = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(createBookSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        return container.services.mediaTracking.createManualBook(currentUser.id, data);
    });
