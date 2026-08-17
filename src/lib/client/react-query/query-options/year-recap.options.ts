import {MediaType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import {getYearRecap, getYearRecapReleases} from "@/lib/server/functions/year-recap";


export const yearRecapReleasesOptions = queryOptions({
    queryKey: ["year-recap-releases"],
    queryFn: () => getYearRecapReleases(),
    staleTime: 60 * 1000,
});


export const yearRecapOptions = (username: string, year: number, mediaType?: MediaType) => queryOptions({
    queryKey: ["year-recap", username, year, mediaType ?? "all"],
    queryFn: () => getYearRecap({ data: { username, year, mediaType } }),
    staleTime: 5 * 60 * 1000,
});
