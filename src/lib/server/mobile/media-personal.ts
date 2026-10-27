import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {toActor} from "@/lib/server/authorization";
import {PrivacyType, TagAction} from "@/lib/utils/enums";
import {mediaParamsSchema} from "./media";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {FormattedError} from "@/lib/utils/error-classes";
import {createCollectionSchema} from "@/lib/schemas/collections.schema";
import {imageUrlSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";
import {updateBookCoverSchema} from "@/lib/schemas/media-details.schema";
import {editUserTagSchema, updateUserCustomCoverSchema} from "@/lib/schemas/user-media.schema";


type Params = z.infer<typeof mediaParamsSchema>;


const coverInputSchema = z.object({
    imageUrl: imageUrlSchema.optional(),
    image: z.object({ data: z.base64().max(14_000_000), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]) }).optional(),
});


export const mobileMediaActionSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("tag"), name: editUserTagSchema.shape.tag.shape.name.trim().min(1), selected: z.boolean() }),
    z.object({ action: z.literal("notifications"), enabled: z.boolean() }),
    z.object({ action: z.literal("collection"), collectionId: positiveIntFieldSchema, selected: z.boolean() }),
    z.object({ action: z.literal("create-collection"), title: createCollectionSchema.shape.title }),
    coverInputSchema.extend({ action: z.literal("cover"), remove: z.boolean().default(false) }),
    coverInputSchema.extend({ action: z.literal("book-cover") }),
]);


export async function getMobileMediaHistory(userId: number, { mediaType, mediaId }: Params, page = 1) {
    const { services } = await getContainer();
    const rows = services.updateHistory.getUserMediaHistory(userId, mediaType, mediaId, { limit: 31, offset: (page - 1) * 30 });

    return {
        page,
        hasMore: rows.length > 30,
        items: rows.slice(0, 30).map(item => ({ ...item, timestamp: dateFromUTCInput(item.timestamp).toISOString() }))
    };
}


export async function getMobileMediaTags(userId: number, { mediaType }: Params) {
    const { registries } = await getContainer();

    return registries.mediaService.get(mediaType).getTagNames(userId);
}


export async function actOnMobileMedia(userId: number, media: Params, input: z.infer<typeof mobileMediaActionSchema>) {
    const { services, registries } = await getContainer();
    const service = registries.mediaService.get(media.mediaType);
    switch (input.action) {
        case "tag":
            await service.editUserTag(userId, { name: input.name }, input.selected ? TagAction.ADD : TagAction.DELETE_ONE, media.mediaId);
            break;
        case "notifications":
            service.updateUserMediaNotifications(userId, media.mediaId, input.enabled);
            break;
        case "collection": {
            const params = { ...media, collectionId: input.collectionId, actor: toActor({ id: userId }) };
            if (input.selected) services.collections.addMediaToCollection(params);
            else services.collections.removeMediaFromCollection(params);
            break;
        }
        case "create-collection":
            services.collections.createCollection({
                title: input.title,
                ownerId: userId,
                privacy: PrivacyType.PRIVATE,
                ordered: false,
                items: [media]
            });
            break;
        case "cover":
        case "book-cover": {
            const imageFile = input.image ? new File([Buffer.from(input.image.data, "base64")], "cover", { type: input.image.mimeType }) : undefined;
            if (input.action === "cover") await service.updateUserCustomCover(userId, updateUserCustomCoverSchema.parse({
                ...media,
                imageUrl: input.imageUrl,
                imageFile,
                remove: input.remove
            }));
            else {
                if (media.mediaType !== "books") throw new FormattedError("Only books have a community cover.");
                const data = updateBookCoverSchema.parse({ mediaId: media.mediaId, imageUrl: input.imageUrl, imageFile });
                await registries.mediaService.get("books").updateDefaultCover(media.mediaId, data);
            }
            break;
        }
    }

    return { saved: true };
}
