import {SearchType} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getTrendsMedia} from "@/lib/server/functions/trends";
import {getComingNextMedia} from "@/lib/server/functions/coming-next";
import {getAdminAllUpdatesHistory} from "@/lib/server/functions/admin";
import {getGameCompatiblePlatforms, getJobDetails, getMediaDetails, getMediaDetailsToEdit, resolveExternalMedia} from "@/lib/server/functions/media-details";


export const upcomingOptions = queryOptions({
    queryKey: ["upcoming"],
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


export const mediaDetailsOptions = (mediaType: MediaType, mediaId: number) => queryOptions({
    queryKey: ["details", mediaType, mediaId] as const,
    queryFn: () => getMediaDetails({ data: { mediaType, mediaId } }),
    staleTime: 3 * 1000,
});


export const gameCompatiblePlatformsOptions = (mediaId: number, enabled: boolean) => queryOptions({
    queryKey: ["gameCompatiblePlatforms", mediaId] as const,
    queryFn: () => getGameCompatiblePlatforms({ data: { mediaType: MediaType.GAMES, mediaId } }),
    staleTime: 10 * 60 * 1000,
    enabled,
});


export const adminAllUpdatesOptions = (filters: SearchType) => queryOptions({
    queryKey: ["adminAllUpdates", filters],
    queryFn: () => getAdminAllUpdatesHistory({ data: filters }),
});


export const editMediaDetailsOptions = (mediaType: MediaType, mediaId: number) => queryOptions({
    queryKey: ["editDetails", mediaType, mediaId],
    queryFn: () => getMediaDetailsToEdit({ data: { mediaType, mediaId } }),
    gcTime: 0,
    staleTime: 0,
});


export const jobDetailsOptions = (mediaType: MediaType, job: JobType, name: string, search: SearchType) => queryOptions({
    queryKey: ["jobDetails", mediaType, job, name, search],
    queryFn: () => getJobDetails({ data: { mediaType, job, name, search } }),
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
