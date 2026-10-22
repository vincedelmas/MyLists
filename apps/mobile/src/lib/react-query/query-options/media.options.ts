import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api, type ListInput, type MediaParams, type MediaType } from "../../api-client";

export const mediaOptions = (params: MediaParams) =>
    queryOptions({
        queryKey: ["media", params.mediaType, params.mediaId],
        queryFn: ({ signal }) => api.media(params, signal),
    });

export const listOptions = (mediaType: MediaType, filters: Omit<ListInput, "page">, userId?: number) =>
    infiniteQueryOptions({
        queryKey: ["lists", mediaType, filters, userId],
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) => api.list(mediaType, { ...filters, page: pageParam }, signal, userId),
        getNextPageParam: (page) =>
            page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
    });

export const listsSummaryOptions = queryOptions({
    queryKey: ["lists", "summary"],
    queryFn: ({ signal }) => api.lists(signal),
});

export const mediaDetailsOptions = (params: MediaParams) =>
    queryOptions({
        queryKey: ["media", params.mediaType, params.mediaId, "details"],
        queryFn: ({ signal }) => api.mediaDetails(params, signal),
    });
export const mediaCommunityOptions = (params: MediaParams) =>
    infiniteQueryOptions({
        queryKey: ["media", params.mediaType, params.mediaId, "community"],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.mediaCommunity(params, pageParam, signal),
        getNextPageParam: (page) => (page.page < page.pages ? page.page + 1 : undefined),
    });
export const mediaCollectionsOptions = (params: MediaParams) =>
    queryOptions({
        queryKey: ["media", params.mediaType, params.mediaId, "collections"],
        queryFn: ({ signal }) => api.mediaCollections(params, signal),
    });
export const mediaEditOptions = (params: MediaParams) =>
    queryOptions({
        queryKey: ["media", params.mediaType, params.mediaId, "edit"],
        queryFn: ({ signal }) => api.mediaEdit(params, signal),
    });

export const listFiltersOptions = (mediaType: MediaType, userId?: number) =>
    queryOptions({
        queryKey: ["lists", mediaType, "filters", userId],
        queryFn: ({ signal }) => api.listFilters(mediaType, signal, userId),
    });
export const listFilterSearchOptions = (
    mediaType: MediaType,
    field: Parameters<typeof api.searchListFilters>[1],
    query: string,
    userId?: number,
) =>
    queryOptions({
        queryKey: ["lists", mediaType, "filter-search", field, query, userId],
        queryFn: ({ signal }) => api.searchListFilters(mediaType, field, query, signal, userId),
        enabled: query.length >= 2,
        staleTime: 60_000,
    });
