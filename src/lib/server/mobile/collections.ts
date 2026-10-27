import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {toActor} from "@/lib/server/authorization";
import {collectionDetailsReadSchema, collectionIdSchema, collectionsBrowseFiltersSchema} from "@/lib/schemas/collections.schema";
import {mobileImagePath} from "./images";


export const mobileCollectionActionSchema = collectionIdSchema.extend({
    action: z.enum(["like", "copy", "view"]),
}).strict();


export async function getMobileCommunityCollections(userId: number, filters: z.infer<typeof collectionsBrowseFiltersSchema>) {
    const { services } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    const result = await services.collections.getPublicCollections(filters, toActor(user));

    return {
        ...result,
        items: result.items.map(collection => ({
            ...collection,
            ownerImage: collection.ownerImage ? mobileImagePath(collection.ownerImage) : null,
            previews: collection.previews.map(preview => ({ ...preview, mediaCover: mobileImagePath(preview.mediaCover) })),
        })),
    };
}


export async function getMobileCommunityCollection(userId: number, input: z.infer<typeof collectionDetailsReadSchema>) {
    const { services } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    const { collectionId, includeFilterOptions, ...filters } = input;
    const result = await services.collections.getCollectionDetails(collectionId, "read", toActor(user), filters, includeFilterOptions);

    return {
        ...result,
        isOwn: result.collection.ownerId === userId,
        ratingSystem: user.ratingSystem,
        collection: {
            ...result.collection,
            ownerImage: result.collection.ownerImage ? mobileImagePath(result.collection.ownerImage) : null,
        },
        items: result.items.map(item => ({
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            name: item.mediaName,
            cover: mobileImagePath(item.mediaCover),
            status: item.status,
            rating: item.rating,
            favorite: item.favorite,
            hasComment: Boolean(item.userMedia?.comment),
            annotation: item.annotation,
            orderIndex: item.orderIndex,
        })),
    };
}


export async function actOnMobileCommunityCollection(userId: number, input: z.infer<typeof mobileCollectionActionSchema>) {
    const { services } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    const actor = toActor(user);

    if (input.action === "like") return { action: input.action, ...services.collections.toggleLike(input.collectionId, actor) };
    if (input.action === "copy") return { action: input.action, ...services.collections.copyCollection(input.collectionId, actor) };

    services.collections.recordCollectionView(input.collectionId, actor);

    return { action: input.action };
}
