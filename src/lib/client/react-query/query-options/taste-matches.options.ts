import {TasteMatchesSearch} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getTasteMatches} from "@/lib/server/functions/taste-matches";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const tasteMatchesOptions = (search: TasteMatchesSearch) => queryOptions({
    queryKey: viewerScopedKey(["tasteMatches", search]),
    queryFn: () => getTasteMatches({ data: search }),
    staleTime: 5 * 60 * 1000,
});
