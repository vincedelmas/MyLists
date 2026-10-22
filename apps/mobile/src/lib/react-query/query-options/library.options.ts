import { api } from "../../api-client";
import { infiniteQueryOptions } from "@tanstack/react-query";

export const libraryOptions = (search: string) =>
    infiniteQueryOptions({
        queryKey: ["lists", "library", search],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.library({ search, page: pageParam }, signal),
        getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
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
