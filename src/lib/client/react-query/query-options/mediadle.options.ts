import {queryOptions} from "@tanstack/react-query";
import {getDailyMediadle, getMediadleSuggestions} from "@/lib/server/functions/moviedle";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const dailyMediadleOptions = () => queryOptions({
    queryKey: viewerScopedKey(["daily-mediadle"]),
    queryFn: () => getDailyMediadle(),
});


export const mediadleSuggestionsOptions = (query: string) => {
    const trimmedQuery = query.trim();

    return queryOptions({
        queryKey: viewerScopedKey(["mediadleSuggestions", trimmedQuery]),
        queryFn: () => getMediadleSuggestions({ data: { query: trimmedQuery } }),
        staleTime: 2 * 60 * 1000,
        enabled: trimmedQuery.length >= 1,
    });
}
