import type {MediaType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";


export const MEDIA_BROWSE_LIBRARY_OPTIONS = [
    { value: "all", label: "All titles" },
    { value: "in", label: "In my list" },
    { value: "out", label: "Not in my list" },
];


export const createMediaBrowseStatusOptions = (mediaTypes: readonly MediaType[]) => [
    { value: "all", label: "All statuses" },
    ...[...new Set(mediaTypes.flatMap(t => getMediaDefinition(t).statuses))].map(status => ({ value: status, label: status })),
];
