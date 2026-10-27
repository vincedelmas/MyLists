import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {toActor} from "@/lib/server/authorization";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";
import {dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";
import {createCollectionSchema} from "@/lib/schemas/collections.schema";
import {profilePinsRepository} from "@/lib/server/domain/profile/profile-pins.repository";
import {profilePinSchema} from "@/lib/schemas/profile-pins.schema";

export const libraryItemSchema = profilePinSchema.omit({ pinned: true });
export const libraryActionSchema = z.discriminatedUnion("action", [
    libraryItemSchema.extend({ action: z.literal("delete") }),
    profilePinSchema.extend({ action: z.literal("pin") }),
    z.object({ action: z.literal("dynamic"), id: z.number().int().positive(), spec: dynamicListSpecSchema }),
    createCollectionSchema.pick({ title: true, description: true, privacy: true, ordered: true }).extend({ action: z.literal("collection"), id: z.number().int().positive() }),
]);

export async function getMobileLibraryEditor(userId: number, item: z.infer<typeof libraryItemSchema>) {
    if (item.kind === "dynamic") return { kind: "dynamic" as const, view: dynamicListsRepository.get(userId, item.id) };
    const { services } = await getContainer();
    const result = await services.collections.getCollectionDetails(item.id, "edit", toActor({ id: userId }));
    return { kind: "collection" as const, collection: result.collection };
}

export async function actOnMobileLibrary(userId: number, input: z.infer<typeof libraryActionSchema>) {
    if (input.action === "pin") profilePinsRepository.set(userId, input, input.pinned);
    else if (input.action === "dynamic") dynamicListsRepository.update(userId, input.id, input.spec);
    else if (input.action === "delete" && input.kind === "dynamic") dynamicListsRepository.delete(userId, input.id);
    else {
        const { services } = await getContainer();
        const actor = toActor({ id: userId });
        if (input.action === "delete") services.collections.deleteCollection(input.id, actor);
        else {
            const existing = await services.collections.getCollectionDetails(input.id, "edit", actor);
            services.collections.updateCollection({
                actor, collectionId: input.id, title: input.title, description: input.description, privacy: input.privacy, ordered: input.ordered,
                items: existing.items.map(item => ({ mediaId: item.mediaId, mediaType: item.mediaType, annotation: item.annotation })),
            });
        }
    }
    return { saved: true };
}
