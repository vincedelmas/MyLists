import {queryOptions} from "@tanstack/react-query";
import {api} from "../../api-client";


export const communityCollectionsOptions = (filters: Parameters<typeof api.communityCollections>[0]) => queryOptions({
    queryKey: ["collections", "community", filters],
    queryFn: ({ signal }) => api.communityCollections(filters, signal),
});


export const communityCollectionOptions = (filters: Parameters<typeof api.communityCollection>[0]) => queryOptions({
    queryKey: ["collections", "details", filters.collectionId, filters],
    queryFn: ({ signal }) => api.communityCollection(filters, signal),
});
