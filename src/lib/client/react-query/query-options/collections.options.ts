import {MediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import type {CommunitySearch, UserCollectionsSearch} from "@/lib/schemas";
import {
    getCommunityCollections,
    getEditCollectionDetails,
    getMediaCommunityCollections,
    getPaginatedUserCollections,
    getReadCollectionDetails,
    getUserCollectionMemberships
} from "@/lib/server/functions/collections";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const paginatedUserCollectionsOptions = (search: UserCollectionsSearch) => queryOptions({
    queryKey: viewerScopedKey(["collections", "user", "paginated", search]),
    queryFn: () => getPaginatedUserCollections({ data: search }),
});


export const collectionDetailsReadOptions = (collectionId: number) => queryOptions({
    queryKey: viewerScopedKey(["collections", "details", "read", collectionId]),
    queryFn: () => getReadCollectionDetails({ data: { collectionId } }),
});


export const collectionDetailsEditOptions = (collectionId: number) => queryOptions({
    queryKey: viewerScopedKey(["collections", "details", "edit", collectionId]),
    queryFn: () => getEditCollectionDetails({ data: { collectionId } }),
});


export const communityCollectionsOptions = (search: CommunitySearch) => queryOptions({
    queryKey: viewerScopedKey(["collections", "community", search]),
    queryFn: () => getCommunityCollections({ data: search }),
});


export const mediaCommunityCollectionsOptions = (mediaId: number, mediaType: MediaType) => queryOptions({
    queryKey: viewerScopedKey(["details", "collections", "community", mediaType, mediaId]),
    queryFn: () => getMediaCommunityCollections({ data: { mediaId, mediaType } }),
    meta: { errorToastMessage: "Community collections could not be loaded." },
});


export const userCollectionMembershipsOptions = (mediaId: number, mediaType: MediaType, isOpen: boolean) => queryOptions({
    queryKey: viewerScopedKey(["collections", "memberships", mediaType, mediaId]),
    queryFn: () => getUserCollectionMemberships({ data: { mediaId, mediaType } }),
    enabled: isOpen,
});
