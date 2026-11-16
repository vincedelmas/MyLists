import * as z from "zod";
import {mediaTabSearchSchema} from "@/lib/schemas/search.schema";
import type {MediaSortKey} from "@/lib/media-definitions/base/media-sorting";
import {mediaCatalogBrowseSearchSchema} from "@/lib/schemas/media-browse.schema";
import {optionalTrimmedSearchFieldSchema, paginationSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export type ContinueSearch = Partial<z.infer<typeof continueSearchSchema>>;


export const CONTINUE_SORT_KEYS = [
    "modified_newest",
    "modified_oldest",
    "added_newest",
    "added_oldest",
    "title_asc",
    "title_desc",
] as const satisfies readonly MediaSortKey[];


export const continueSearchSchema = mediaTabSearchSchema.extend({
    page: paginationSchema.shape.page,
    search: optionalTrimmedSearchFieldSchema,
    display: mediaCatalogBrowseSearchSchema.shape.display,
    sorting: z.enum(CONTINUE_SORT_KEYS).optional().catch(undefined),
    progress: z.enum(["all", "active", "ready"]).optional().catch(undefined),
});


export const continueRequestSchema = continueSearchSchema.omit({ display: true }).extend({
    username: usernameFieldSchema,
    preview: z.boolean().optional(),
});
