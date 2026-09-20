import * as z from "zod";
import {positiveIntFieldSchema} from "@/lib/schemas/common.schema";

export const bookCatalogueSchema = z.object({ query: z.string().trim().max(200).default(""), page: positiveIntFieldSchema.default(1) });
export const bookWorkSchema = z.object({ mediaId: positiveIntFieldSchema });
export const bookEditionRefreshSchema = bookWorkSchema.extend({ editionId: positiveIntFieldSchema });
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
