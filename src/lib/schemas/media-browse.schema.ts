import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {scopedMediaFiltersSchema} from "@/lib/schemas/media-filters.schema";
import {createMediaFiltersSchema} from "@/lib/media-definitions/base/media-filters";
import {mediaCommonFilterSchemas} from "@/lib/media-definitions/definition.registry";
import {paginationSchema} from "@/lib/schemas/common.schema";
import {MEDIA_CATALOG_SORT_KEYS, MEDIA_SORT_KEYS} from "@/lib/media-definitions/base/media-sorting";


export type MediaBrowseFilters = z.infer<typeof mediaBrowseFiltersSchema>;
export type MediaCatalogBrowseFilters = z.infer<typeof mediaCatalogBrowseFiltersSchema>;


export const mediaBrowseFiltersSchema = paginationSchema.pick({ page: true }).extend({
    ...createMediaFiltersSchema(mediaCommonFilterSchemas).shape,
    search: mediaCommonFilterSchemas.search.optional().catch(undefined),
    mediaType: z.enum(MediaType).optional(),
    library: z.enum(["in", "out"]).optional(),
    mediaFilters: scopedMediaFiltersSchema.optional(),
    sorting: z.enum(["default", ...MEDIA_SORT_KEYS]).optional(),
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
