import * as z from "zod";
import {positiveIntFieldSchema} from "@/lib/schemas/common.schema";

export const bookCatalogueSchema = z.object({ query: z.string().trim().max(200).default(""), page: positiveIntFieldSchema.default(1), sort: z.enum(["readers", "title", "oldest"]).default("readers") });
export const bookWorkSchema = z.object({ mediaId: positiveIntFieldSchema });
export const bookEditionRefreshSchema = bookWorkSchema.extend({ editionId: positiveIntFieldSchema });
export const bookIsbnLookupSchema = bookWorkSchema.extend({isbn: z.string().trim().min(10).max(32)});
export const bookIsbnSelectSchema = bookIsbnLookupSchema.extend({apiId: z.string().trim().min(1).max(200)});
export const bookReviewQueueSchema = z.object({page: positiveIntFieldSchema.default(1), confidence: z.enum(["all", "high", "possible", "author"]).default("all")});
export const bookWorkPairSchema = z.object({ sourceId: positiveIntFieldSchema, targetId: positiveIntFieldSchema })
    .refine(data => data.sourceId !== data.targetId, "Choose two different works.");
export const bookMergePreviewSchema = bookWorkPairSchema.safeExtend({ editionId: positiveIntFieldSchema.optional() });
export const bookMergeSchema = bookMergePreviewSchema.safeExtend({
    version: z.string().length(64),
    metadata: z.enum(["source", "target"]).default("target"),
    resolutions: z.array(z.object({
        userId: positiveIntFieldSchema,
        keep: z.enum(["source", "target"]),
        reading: z.enum(["combine", "duplicate"]),
    })).default([]),
});
export type BookMergeInput = z.infer<typeof bookMergeSchema>;
export const bookSplitSchema = z.object({ editionId: positiveIntFieldSchema, name: z.string().trim().min(1).max(500) });

export const BOOK_WORK_SELECTION_LIMIT = 50;
const selectedWorkIds = z.array(positiveIntFieldSchema).max(BOOK_WORK_SELECTION_LIMIT)
    .refine(ids => new Set(ids).size === ids.length, "Select each work only once.");
export const bookGroupPreviewSchema = z.object({ workIds: selectedWorkIds.min(1) });
export const bookGroupSeparateSchema = z.object({workIds: selectedWorkIds.min(2)});
export const bookGroupMergeSchema = z.object({
    workIds: selectedWorkIds.min(2),
    targetId: positiveIntFieldSchema,
    version: z.string().length(64),
    resolutions: z.array(z.object({
        userId: positiveIntFieldSchema,
        keepWorkId: positiveIntFieldSchema,
        reading: z.enum(["combine", "duplicate"]),
    })).default([]),
}).refine(data => data.workIds.includes(data.targetId), "The work to keep must be in your selection.");
export type BookGroupMergeInput = z.infer<typeof bookGroupMergeSchema>;
