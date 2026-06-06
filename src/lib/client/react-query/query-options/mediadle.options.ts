import {queryOptions} from "@tanstack/react-query";
import {getDailyMediadle, getMediadleSuggestions} from "@/lib/server/functions/moviedle";


export const dailyMediadleOptions = queryOptions({
    queryKey: ["daily-mediadle"],
    queryFn: () => getDailyMediadle(),
});


export const mediadleSuggestionsOptions = (query: string) => queryOptions({
    queryKey: ["mediadleSuggestions", query],
    queryFn: () => getMediadleSuggestions({ data: { query } }),
    staleTime: 2 * 60 * 1000,
    enabled: query.length >= 2,
});
