import {queryOptions} from "@tanstack/react-query";
import {CommunitySearch} from "@/lib/types/collections.types";
import {MediaType} from "@/lib/utils/enums";
import {
    getCommunityCollections,
    getEditCollectionDetails,
    getMediaCommunityCollections,
    getReadCollectionDetails,
    getUserCollectionMemberships,
    getUserCollections
} from "@/lib/server/functions/collections";


export const userCollectionsOptions = (username: string, mediaType?: MediaType) => queryOptions({
    queryKey: ["collections", "user", username, mediaType] as const,
    queryFn: () => getUserCollections({ data: { username, mediaType } }),
});


export const collectionDetailsReadOptions = (collectionId: number) => queryOptions({
    queryKey: ["collections", "details", "read", collectionId] as const,
    queryFn: () => getReadCollectionDetails({ data: { collectionId } }),
});


export const collectionDetailsEditOptions = (collectionId: number) => queryOptions({
    queryKey: ["collections", "details", "edit", collectionId] as const,
    queryFn: () => getEditCollectionDetails({ data: { collectionId } }),
});


export const communityCollectionsOptions = (search: CommunitySearch) => queryOptions({
    queryKey: ["collections", "community", search] as const,
    queryFn: () => getCommunityCollections({ data: search }),
});


export const mediaCommunityCollectionsOptions = (mediaId: number, mediaType: MediaType) => queryOptions({
    queryKey: ["details", "collections", "community", mediaType, mediaId],
    queryFn: () => getMediaCommunityCollections({ data: { mediaId, mediaType } }),
});


export const userCollectionMembershipsOptions = (mediaId: number, mediaType: MediaType, isOpen: boolean) => queryOptions({
    queryKey: ["collections", "memberships", mediaType, mediaId] as const,
    queryFn: () => getUserCollectionMemberships({ data: { mediaId, mediaType } }),
    enabled: isOpen,
});
