import {TasteMatchesSearch} from "@/lib/schemas";
import {queryOptions} from "@tanstack/react-query";
import {getTasteMatches} from "@/lib/server/functions/taste-matches";


export const tasteMatchesOptions = (search: TasteMatchesSearch) => queryOptions({
    queryKey: ["tasteMatches", search] as const,
    queryFn: () => getTasteMatches({ data: search }),
    staleTime: 5 * 60 * 1000,
});
