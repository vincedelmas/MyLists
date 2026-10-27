import {api} from "../../api-client";
import {infiniteQueryOptions, queryOptions} from "@tanstack/react-query";

export const libraryOptions = (search: string, page = 1, userId?: number) => queryOptions({
    queryKey: ["lists", "library", search, page, userId],
    queryFn: ({ signal }) => api.library({ search, page }, signal, userId),
});

export const libraryDetailOptions = (
    kind: Parameters<typeof api.libraryDetail>[0]["kind"],
    id?: number,
    userId?: number,
) => {
    return infiniteQueryOptions({
        queryKey: ["lists", "library", kind, id, userId],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            api.libraryDetail({ kind, id, search: "", page: pageParam }, signal, userId),
        getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    });
};
