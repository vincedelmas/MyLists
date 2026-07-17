import type {Pagination, SearchType} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getTrendsMedia} from "@/lib/server/functions/trends";
import {getComingNextMedia} from "@/lib/server/functions/coming-next";
import {getAdminAllUpdatesHistory} from "@/lib/server/functions/admin";
import {
    getGameCompatiblePlatforms,
    getJobDetails,
    getMediaCommunityActivity,
    getMediaDetails,
    getMediaDetailsToEdit,
    resolveExternalMedia
} from "@/lib/server/functions/media-details";
import {
    mediaCommunityActivityKey,
    mediaDetailsKey,
    ViewerCacheIdentity,
} from "@/lib/client/react-query/query-options/media.keys";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";

export {mediaDetailsRootKey} from "@/lib/client/react-query/query-options/media.keys";
export type {ViewerCacheIdentity} from "@/lib/client/react-query/query-options/media.keys";


export const upcomingOptions = () => queryOptions({
    queryKey: viewerScopedKey(["upcoming"]),
    queryFn: () => getComingNextMedia(),
});


export const trendsOptions = queryOptions({
    queryKey: ["trends"],
    queryFn: () => getTrendsMedia(),
    meta: { errorToastMessage: "An error occurred fetching the trends." },
});


export const mediaExternalOptions = (mediaType: MediaType, apiId: string) => queryOptions({
    queryKey: ["media-details", "external", mediaType, apiId] as const,
    queryFn: () => resolveExternalMedia({ data: { mediaType, apiId } }),
})


export const mediaDetailsOptions = (mediaType: MediaType, mediaId: number, viewerId: ViewerCacheIdentity) => queryOptions({
    queryKey: mediaDetailsKey(mediaType, mediaId, viewerId),
    queryFn: () => getMediaDetails({ data: { mediaType, mediaId } }),
    staleTime: 3 * 1000,
});


export const mediaCommunityActivityOptions = (
    mediaId: number,
    mediaType: MediaType,
    viewerId: ViewerCacheIdentity,
    search: Pagination = { page: 1, perPage: 8 },
) => queryOptions({
    queryKey: mediaCommunityActivityKey(mediaId, mediaType, viewerId, search),
    queryFn: () => getMediaCommunityActivity({ data: { mediaId, mediaType, search } }),
    meta: { errorToastMessage: "Community activity could not be loaded." },
});


export const gameCompatiblePlatformsOptions = (mediaId: number, enabled: boolean) => queryOptions({
    queryKey: viewerScopedKey(["gameCompatiblePlatforms", mediaId]),
    queryFn: () => getGameCompatiblePlatforms({ data: { mediaType: MediaType.GAMES, mediaId } }),
    staleTime: 10 * 60 * 1000,
    enabled,
    meta: { errorToastMessage: "Compatible game platforms could not be loaded." },
});


export const adminAllUpdatesOptions = (filters: SearchType) => queryOptions({
    queryKey: viewerScopedKey(["adminAllUpdates", filters]),
    queryFn: () => getAdminAllUpdatesHistory({ data: filters }),
});


export const editMediaDetailsOptions = (mediaType: MediaType, mediaId: number) => queryOptions({
    queryKey: viewerScopedKey(["editDetails", mediaType, mediaId]),
    queryFn: () => getMediaDetailsToEdit({ data: { mediaType, mediaId } }),
    gcTime: 0,
    staleTime: 0,
});


export const jobDetailsOptions = (mediaType: MediaType, job: JobType, name: string, pagination: Pagination) => queryOptions({
    queryKey: viewerScopedKey(["jobDetails", mediaType, job, name, pagination]),
    queryFn: () => getJobDetails({ data: { mediaType, job, name, pagination } }),
    meta: { errorToastMessage: "Contributor details could not be loaded." },
});


export const suggestBookCoverOptions = (mediaName: string, coverUrl: string, enabled: boolean) => {
    return queryOptions({
        queryKey: ["openLibraryCover", mediaName, coverUrl] as const,
        queryFn: () => {
            return new Promise<"available" | "missing">((resolve) => {
                const img = new Image();
                img.onload = () => resolve("available");
                img.onerror = () => resolve("missing");
                img.src = coverUrl;
            });
        },
        staleTime: 10 * 60 * 1000,
        enabled: enabled && Boolean(coverUrl),
    });
};
