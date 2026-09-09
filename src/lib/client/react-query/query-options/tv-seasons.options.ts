import {TvMediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import {getTvSeasons} from "@/lib/server/functions/tv-seasons";


export const tvSeasonsOptions = (mediaType: TvMediaType, mediaId: number, userId: number) => {
    return queryOptions({
        queryKey: ["tvSeasons", mediaType, mediaId, userId] as const,
        queryFn: () => getTvSeasons({ data: { mediaType, mediaId, userId } }),
        staleTime: 0,
    });
}
