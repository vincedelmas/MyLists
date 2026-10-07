import {queryOptions} from "@tanstack/react-query";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {
    getProfileSmartViews,
    getSmartView,
    getSmartViewEditor,
    getSmartViewEditorFilters,
    getSmartViews,
    getUserSmartViews,
    previewSmartViewSummary
} from "@/lib/server/functions/smart-views";


export type SmartViewRecord = Awaited<ReturnType<typeof getSmartViews>>[number];
export type SmartViewSummary = Awaited<ReturnType<typeof previewSmartViewSummary>>;
export type ProfileSmartViewRecord = Awaited<ReturnType<typeof getProfileSmartViews>>[number];


export const smartViewsOptions = queryOptions({
    queryKey: ["smart-views", "list"],
    queryFn: () => getSmartViews(),
});


export const smartViewOptions = (viewId: number, page = 1, filters: Omit<MediaBrowseFilters, "page"> = {}) => queryOptions({
    queryKey: ["smart-views", "details", viewId, page, filters],
    queryFn: () => getSmartView({ data: { id: viewId, page, filters } }),
});


export const smartViewEditorOptions = (viewId: number) => queryOptions({
    queryKey: ["smart-views", "editor", viewId],
    queryFn: () => getSmartViewEditor({ data: { id: viewId } }),
});


export const smartViewEditorFiltersOptions = (mediaTypes: SmartViewSpec["mediaTypes"]) => queryOptions({
    queryKey: ["smart-views", "editor-filters", mediaTypes],
    queryFn: () => getSmartViewEditorFilters({ data: { mediaTypes } }),
});


export const smartViewSummaryOptions = (spec: SmartViewSpec) => queryOptions({
    queryKey: ["smart-views", "summary", spec],
    queryFn: () => previewSmartViewSummary({ data: spec }),
});


export const profileSmartViewsOptions = (username: string) => queryOptions({
    queryKey: ["smart-views", "profile", username],
    queryFn: () => getProfileSmartViews({ data: { username } }),
});


export const userSmartViewsOptions = (username: string) => queryOptions({
    queryKey: ["smart-views", "user", username],
    queryFn: () => getUserSmartViews({ data: { username } }),
});
