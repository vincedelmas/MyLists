import {queryOptions} from "@tanstack/react-query";
import {JobType, MediaType} from "@/lib/utils/enums";
import {MediaListArgs, SimpleSearch} from "@/lib/schemas";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";
import {getUserMediaHistory, getUserTagNames} from "@/lib/server/functions/user-media";
import {getMediaListFilters, getMediaListSearchFilters, getMediaListSF, getTagsViewFn, getUserListHeaderSF} from "@/lib/server/functions/media-lists";


export const mediaListOptions = (mediaType: MediaType, username: string, search: MediaListArgs) => queryOptions({
    queryKey: viewerScopedKey(["userList", mediaType, username, search]),
    queryFn: () => getMediaListSF({ data: { mediaType, username, args: search } }),
});


export const userListHeaderOption = (mediaType: MediaType, username: string) => queryOptions({
    queryKey: viewerScopedKey(["userList", "header", username, mediaType]),
    queryFn: () => getUserListHeaderSF({ data: { mediaType, username } }),
});


export const tagsViewOptions = (mediaType: MediaType, username: string, search: SimpleSearch = {}) => queryOptions({
    queryKey: viewerScopedKey(["tagsView", mediaType, username, search]),
    queryFn: () => getTagsViewFn({ data: { mediaType, username, search } }),
})


export const listFiltersOptions = (mediaType: MediaType, username: string) => queryOptions({
    queryKey: viewerScopedKey(["listFilters", mediaType, username]),
    queryFn: () => getMediaListFilters({ data: { mediaType, username } }),
    staleTime: Infinity,
});


export const filterSearchOptions = (mediaType: MediaType, username: string, query: string, job: JobType) => queryOptions({
    queryKey: viewerScopedKey(["filterSearch", mediaType, username, query, job]),
    queryFn: () => getMediaListSearchFilters({ data: { mediaType, username, query, job } }),
    staleTime: 2 * 60 * 1000,
    enabled: query.length >= 2,
});


export const historyOptions = (mediaType: MediaType, mediaId: number) => queryOptions({
    queryKey: viewerScopedKey(["onOpenHistory", mediaType, mediaId]),
    queryFn: () => getUserMediaHistory({ data: { mediaType, mediaId } }),
    staleTime: 10 * 1000,
    placeholderData: [],
});


export const tagNamesOptions = (mediaType: MediaType, isOpen: boolean) => queryOptions({
    queryKey: viewerScopedKey(["tagNames", mediaType]),
    queryFn: () => getUserTagNames({ data: { mediaType } }),
    enabled: isOpen,
});
