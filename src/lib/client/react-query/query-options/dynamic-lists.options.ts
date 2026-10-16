import {queryOptions} from "@tanstack/react-query";
import type {DynamicListRuntimeFilters, DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {
    getDynamicList,
    getDynamicListEditor,
    getDynamicListEditorFilters,
    getDynamicLists,
    previewDynamicListSummary
} from "@/lib/server/functions/dynamic-lists";


export type DynamicListRecord = Awaited<ReturnType<typeof getDynamicLists>>[number];
export type DynamicListSummary = Awaited<ReturnType<typeof previewDynamicListSummary>>;


export const dynamicListOptions = (listId: number, page = 1, filters: DynamicListRuntimeFilters = {}, includeFilterOptions = false) => queryOptions({
    queryKey: ["dynamic-lists", "details", listId, page, filters, includeFilterOptions],
    queryFn: () => getDynamicList({ data: { id: listId, page, filters, includeFilterOptions } }),
});


export const dynamicListEditorOptions = (listId: number) => queryOptions({
    queryKey: ["dynamic-lists", "editor", listId],
    queryFn: () => getDynamicListEditor({ data: { id: listId } }),
});


export const dynamicListEditorFiltersOptions = (mediaTypes: DynamicListSpec["mediaTypes"]) => queryOptions({
    queryKey: ["dynamic-lists", "editor-filters", mediaTypes],
    queryFn: () => getDynamicListEditorFilters({ data: { mediaTypes } }),
});


export const dynamicListSummaryOptions = (spec: DynamicListSpec) => queryOptions({
    queryKey: ["dynamic-lists", "summary", spec],
    queryFn: () => previewDynamicListSummary({ data: spec }),
});


