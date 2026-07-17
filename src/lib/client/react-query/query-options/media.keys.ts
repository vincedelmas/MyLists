import {Pagination} from "@/lib/schemas/common.schema";
import {MediaType} from "@/lib/utils/enums";


export type ViewerCacheId = number | null;

const viewerKey = (viewerId: ViewerCacheId) => viewerId ?? "anonymous";


export const mediaDetailsRootKey = (mediaType: MediaType, mediaId: number) => ["details", mediaType, mediaId] as const;

export const mediaDetailsKey = (mediaType: MediaType, mediaId: number, viewerId: ViewerCacheId) => [
    ...mediaDetailsRootKey(mediaType, mediaId),
    { viewer: viewerKey(viewerId) },
] as const;

export const mediaCommunityActivityKey = (
    mediaId: number,
    mediaType: MediaType,
    viewerId: ViewerCacheId,
    search: Pagination,
) => ["details", "activity", "community", mediaType, mediaId, { viewer: viewerKey(viewerId) }, search] as const;

