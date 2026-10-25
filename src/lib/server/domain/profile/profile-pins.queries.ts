import type {Actor} from "@/lib/server/authorization";
import {getContainer} from "@/lib/server/core/container";
import {getDynamicListSummaries} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";

export const getProfilePinnedItems = async (userId: number, actor: Actor) => {
    const container = await getContainer();
    const collections = await container.services.collections.getUserCollections(userId, actor, undefined, true);
    const views = dynamicListsRepository.getPinned(userId);
    const summaries = getDynamicListSummaries(userId, views, { includeCovers: false });

    return [
        ...views.map(view => ({
            view,
            kind: "dynamic" as const,
            position: view.profilePosition!,
            preview: { total: summaries.get(view.id)!.total },
        })),
        ...collections.map(collection => ({
            kind: "collection" as const,
            position: collection.profilePosition!,
            collection,
        })),
    ].sort((a, b) => a.position - b.position);
};
