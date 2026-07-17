import type {QueryClient, QueryKey} from "@tanstack/react-query";
import {MediaType} from "@/lib/utils/enums";
import {mediaDetailsRootKey} from "@/lib/client/react-query/query-options/media.keys";


export type LibraryMutationEffect = "add" | "remove" | "update" | "cover" | "tag";

interface LibraryMutationEffectInput {
    effect: LibraryMutationEffect;
    mediaType: MediaType;
    mediaId?: number;
    viewerName?: string;
    sourceQueryKey?: QueryKey;
    recordsActivity?: boolean;
}


/** Query prefixes owned by a concrete library command effect. */
export const libraryMutationInvalidationKeys = ({
    effect,
    mediaType,
    mediaId,
    viewerName,
    sourceQueryKey,
    recordsActivity = false,
}: LibraryMutationEffectInput): QueryKey[] => {
    const presentation: QueryKey[] = [
        ...(sourceQueryKey ? [sourceQueryKey] : []),
        ...(mediaId === undefined ? [["details", mediaType] as QueryKey] : [mediaDetailsRootKey(mediaType, mediaId)]),
        ["userList", mediaType],
    ];

    if (effect === "cover") return presentation;
    if (effect === "tag") {
        return [
            ...presentation,
            ["tagNames", mediaType],
            ...(viewerName ? [["tagsView", mediaType, viewerName] as QueryKey] : []),
        ];
    }

    const entryEffects: QueryKey[] = [
        ...presentation,
        ...(mediaId === undefined ? [] : [
            ["details", "activity", "community", mediaType, mediaId],
            ["onOpenHistory", mediaType, mediaId],
        ]),
        ["upcoming"],
    ];
    if (!viewerName) return entryEffects;

    return [
        ...entryEffects,
        ["userList", "header", viewerName, mediaType],
        ["profile", viewerName],
        ["userStats", viewerName],
        ["allUpdates", viewerName],
        ...((effect === "add" || recordsActivity) ? [["monthly-activity", viewerName] as QueryKey] : []),
    ];
};


export const invalidateLibraryMutationEffects = async (
    queryClient: QueryClient,
    input: LibraryMutationEffectInput,
) => {
    await Promise.all(libraryMutationInvalidationKeys(input)
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};
