import type {QueryClient, QueryKey} from "@tanstack/react-query";
import {MediaType} from "@/lib/utils/enums";
import {mediaDetailsRootKey} from "@/lib/client/react-query/query-options/media.keys";


export type CatalogMutationEffect = "cover" | "edit" | "refresh";


/** Cache prefixes owned by each catalog mutation effect. */
export const catalogMutationInvalidationKeys = (
    effect: CatalogMutationEffect,
    mediaType: MediaType,
    mediaId: number,
): QueryKey[] => {
    const presentationKeys: QueryKey[] = [
        mediaDetailsRootKey(mediaType, mediaId),
        ["userList", mediaType],
        ["profile"],
        ["collections"],
        ["navSearch"],
        ["trends"],
    ];
    if (effect === "cover") return presentationKeys;

    const metadataKeys: QueryKey[] = [
        ...presentationKeys,
        ["editDetails", mediaType, mediaId],
        ["listFilters", mediaType],
        ["filterSearch", mediaType],
        ["jobDetails", mediaType],
        ["userList", "header"],
        ["userStats"],
        ["upcoming"],
    ];

    return effect === "refresh" && mediaType === MediaType.GAMES
        ? [...metadataKeys, ["gameCompatiblePlatforms", mediaId]]
        : metadataKeys;
};


export const invalidateCatalogMutationEffects = async (
    queryClient: QueryClient,
    effect: CatalogMutationEffect,
    mediaType: MediaType,
    mediaId: number,
) => {
    await Promise.all(catalogMutationInvalidationKeys(effect, mediaType, mediaId)
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};
