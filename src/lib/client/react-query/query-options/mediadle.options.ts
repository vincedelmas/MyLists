import {queryOptions} from "@tanstack/react-query";
import {getDailyMediadle, getMediadleSuggestions} from "@/lib/server/functions/moviedle";


export const dailyMediadleOptions = queryOptions({
    queryKey: ["daily-mediadle"],
    queryFn: () => getDailyMediadle(),
});


export const mediadleSuggestionsOptions = (query: string) => {
    const trimmedQuery = query.trim();

    return queryOptions({
        queryKey: ["mediadleSuggestions", trimmedQuery],
        queryFn: () => getMediadleSuggestions({ data: { query: trimmedQuery } }),
        staleTime: 2 * 60 * 1000,
        enabled: trimmedQuery.length >= 1,
    });
}
