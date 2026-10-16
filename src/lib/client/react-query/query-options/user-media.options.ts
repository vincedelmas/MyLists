import {MediaType} from "@/lib/utils/enums";
import {MediaListArgs} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getUserMediaHistory, getUserTagNames} from "@/lib/server/functions/user-media";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";
import {getMediaListFilters, getMediaListSF, getTagsViewFn, getUserListHeaderSF} from "@/lib/server/functions/media-lists";


export const mediaListOptions = (mediaType: MediaType, username: string, search: MediaListArgs) => queryOptions({
    queryKey: ["userList", mediaType, username, search] as const,
    queryFn: () => getMediaListSF({ data: { mediaType, username, args: search } }),
});


export const userListHeaderOption = (mediaType: MediaType, username: string) => queryOptions({
    queryKey: ["userList", "header", username, mediaType] as const,
    queryFn: () => getUserListHeaderSF({ data: { mediaType, username } }),
});


export const tagsViewOptions = (mediaType: MediaType, username: string) => queryOptions({
    queryKey: ["tagsView", mediaType, username] as const,
    queryFn: () => getTagsViewFn({ data: { mediaType, username } }),
})


export const listFiltersOptions = (mediaType: MediaType, username: string, metadataFields: MediaMetadataFilterKey[]) => queryOptions({
    queryKey: ["listFilters", mediaType, username, metadataFields],
    queryFn: () => getMediaListFilters({ data: { mediaType, username, metadataFields } }),
    staleTime: Infinity,
});


export const historyOptions = (mediaType: MediaType, mediaId: number) => queryOptions({
    queryKey: ["onOpenHistory", mediaType, mediaId],
    queryFn: () => getUserMediaHistory({ data: { mediaType, mediaId } }),
    staleTime: 10 * 1000,
    placeholderData: [],
});


export const tagNamesOptions = (mediaType: MediaType, isOpen: boolean) => queryOptions({
    queryKey: ["tagNames", mediaType] as const,
    queryFn: () => getUserTagNames({ data: { mediaType } }),
    enabled: isOpen,
});
