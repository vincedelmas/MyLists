import * as z from "zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {optionalSearchFieldSchema, paginationSchema} from "@/lib/schemas/common.schema";
import {MEDIA_CATALOG_SORT_KEYS, MEDIA_SORT_KEYS} from "@/lib/media-definitions/base/media-sorting";


export type MediaBrowseFilters = z.infer<typeof mediaBrowseFiltersSchema>;
export type MediaCatalogBrowseFilters = z.infer<typeof mediaCatalogBrowseFiltersSchema>;


export const MAX_MEDIA_BROWSE_FILTER_VALUES = 20;


export const mediaBrowseFiltersSchema = paginationSchema.pick({ page: true }).extend({
    favorite: z.boolean().optional(),
    search: optionalSearchFieldSchema,
    status: z.enum(Status).optional(),
    mediaType: z.enum(MediaType).optional(),
    library: z.enum(["in", "out"]).optional(),
    sorting: z.enum(["default", ...MEDIA_SORT_KEYS]).optional(),
    minRating: z.coerce.number().min(0).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(MAX_MEDIA_BROWSE_FILTER_VALUES).optional(),
    genres: z.array(z.string().trim().min(1).max(100)).max(MAX_MEDIA_BROWSE_FILTER_VALUES).optional(),
});


export const mediaCatalogBrowseFiltersSchema = mediaBrowseFiltersSchema.pick({
    page: true, search: true, library: true, sorting: true,
}).extend({
    sorting: z.enum(["default", ...MEDIA_CATALOG_SORT_KEYS]).optional(),
});


export const mediaCatalogBrowseSearchSchema = mediaCatalogBrowseFiltersSchema.extend({
    display: z.enum(["grid", "table"]).optional(),
    sorting: z.enum(["default", ...MEDIA_CATALOG_SORT_KEYS]).optional().catch(undefined),
});
