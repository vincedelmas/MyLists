import {queryOptions} from "@tanstack/react-query";
import type {UserCollectionsSearch} from "@/lib/schemas";
import type {UserListViewsSearch} from "@/lib/schemas/lists.schema";
import {getListsCollections, getUserListViews} from "@/lib/server/functions/lists";


export const userListViewsOptions = (filters: UserListViewsSearch) => queryOptions({
    queryKey: ["dynamic-lists", "user", filters.username, "hub", filters] as const,
    queryFn: () => getUserListViews({ data: filters }),
});


export const listsCollectionsOptions = (filters: UserCollectionsSearch) => queryOptions({
    queryKey: ["collections", "user", "hub", filters] as const,
    queryFn: () => getListsCollections({ data: filters }),
});
