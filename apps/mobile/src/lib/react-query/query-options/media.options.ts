import {infiniteQueryOptions, queryOptions} from "@tanstack/react-query";
import {api, type ListInput, type MediaParams, type MediaType} from "../../api-client";

export const mediaOptions = (params: MediaParams) =>
    queryOptions({
        queryKey: ["media", params.mediaType, params.mediaId],
        queryFn: ({signal}) => api.media(params, signal),
    });

export const listOptions = (mediaType: MediaType, filters: Omit<ListInput, "page">) =>
    infiniteQueryOptions({
        queryKey: ["lists", mediaType, filters],
        initialPageParam: 1,
        queryFn: ({pageParam, signal}) => api.list(mediaType, {...filters, page: pageParam}, signal),
        getNextPageParam: (page) =>
            page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
    });

export const listsSummaryOptions = queryOptions({
    queryKey: ["lists", "summary"],
    queryFn: ({signal}) => api.lists(signal),
});
