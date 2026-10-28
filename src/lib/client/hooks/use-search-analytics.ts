import {useEffect, useRef} from "react";
import {captureEvent} from "@/lib/client/analytics";
import type {ApiProviderType} from "@/lib/utils/enums";


// Keep search key locally for dedup, never send search text to analytics !
export function useSearchAnalytics(
    searchKey: readonly unknown[],
    surface: "navbar" | "mobile" | "search_page",
    provider: ApiProviderType,
    page: number,
    resultCount: number | undefined,
    ready: boolean,
    advancedFilterCount = 0,
) {
    const key = JSON.stringify(searchKey);
    const lastSearch = useRef<string | null>(null);

    useEffect(() => {
        // Track results actually displayed, including cached results and direct page visits
        // oxlint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
        if (!ready || resultCount === undefined || lastSearch.current === key) return;

        lastSearch.current = key;
        captureEvent("search_results_viewed", {
            page,
            surface,
            provider,
            result_count: resultCount,
            advanced_filter_count: advancedFilterCount,
        });
        
    }, [key, surface, provider, page, resultCount, ready, advancedFilterCount]);
}
