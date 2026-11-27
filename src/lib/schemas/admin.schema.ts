import * as z from "zod";
import {ImportJobStatus, MediaType, PrivacyType, RoleType} from "@/lib/utils/enums";
import {YEAR_RECAP_FIRST_YEAR, yearRecapReleaseModes} from "@/lib/types/year-recap.types";
import {
    coercedPositiveIntFieldSchema,
    imageFileSchema,
    imageUrlSchema,
    optionalTrimmedSearchFieldSchema,
    positiveIntFieldSchema,
    searchTypeSchema,
    simpleSearchSchema
} from "@/lib/schemas/common.schema";


export type AdminMergeBooks = z.infer<typeof adminMergeBooksSchema>;
export type AdminImportsSearch = z.infer<typeof adminImportsSchema>;
export type AdminListsSearch = z.infer<typeof adminListsSearchSchema>;
export type AdminUpdatePayload = z.infer<typeof adminUpdatePayloadSchema>;
export type AdminBookMergeSearch = z.infer<typeof adminBookMergeSearchSchema>;
export type AdminMissingCoversSearch = z.infer<typeof adminMissingCoversSchema>;
export type AdminUpdateMediaCover = z.infer<typeof adminUpdateMediaCoverSchema>;
export type AdminUpdateMediaCoverInput = z.input<typeof adminUpdateMediaCoverSchema>;


export const adminBookMergeSearchSchema = simpleSearchSchema.extend({
    author: optionalTrimmedSearchFieldSchema,
    view: z.enum(["suggestions", "duplicates", "authors", "catalog"]).catch("duplicates"),
});


export const adminDismissBookMergeSuggestionSchema = z.object({
    suggestionId: positiveIntFieldSchema,
});


export const adminListsSearchSchema = searchTypeSchema.extend({
    listType: z.enum(["collections", "dynamic"]).default("collections"),
});


export const adminMissingCoversSchema = simpleSearchSchema.extend({
    mediaType: z.enum(MediaType).optional(),
});


export const adminUpdateMediaCoverSchema = z.object({
    mediaType: z.enum(MediaType),
    imageUrl: imageUrlSchema.optional(),
    imageFile: imageFileSchema.optional(),
    mediaId: coercedPositiveIntFieldSchema,
}).superRefine((data, ctx) => {
    const addFieldIssues = (message: string) => {
        ctx.addIssue({ code: "custom", message, path: ["imageUrl"] });
        ctx.addIssue({ code: "custom", message, path: ["imageFile"] });
    };

    if (!data.imageUrl && !data.imageFile) {
        addFieldIssues("Provide an image link or upload a file.");
    }
    if (data.imageUrl && data.imageFile) {
        addFieldIssues("Please, choose only one cover option.");
    }
});


export const adminMergeBooksSchema = z.object({
    targetBookId: positiveIntFieldSchema,
    sourceBookIds: z.array(positiveIntFieldSchema).min(1, "Select at least one duplicate book to merge."),
}).superRefine((data, ctx) => {
    if (data.sourceBookIds.includes(data.targetBookId)) {
        ctx.addIssue({
            code: "custom",
            path: ["sourceBookIds"],
            message: "Target book cannot also be a source book.",
        });
    }
    if (new Set(data.sourceBookIds).size !== data.sourceBookIds.length) {
        ctx.addIssue({
            code: "custom",
            path: ["sourceBookIds"],
            message: "Duplicate source books selected.",
        });
    }
});


export const adminImportsSchema = simpleSearchSchema.extend({
    status: z.enum(ImportJobStatus).optional(),
});


const adminUpdatePayloadSchema = z.object({
    role: z.enum(RoleType).optional(),
    deleteUser: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    privacy: z.enum(PrivacyType).optional(),
    showOnboarding: z.boolean().optional(),
    showUpdateModal: z.boolean().optional(),
});


export const adminPostUpdateUserSchema = z.object({
    userId: positiveIntFieldSchema.optional(),
    payload: adminUpdatePayloadSchema,
});

export const adminUpdateYearRecapReleaseSchema = z.object({
    mode: z.enum(yearRecapReleaseModes),
    year: z.number().int().min(YEAR_RECAP_FIRST_YEAR),
});

export const adminTriggerTaskSchema = z.object({
    taskName: z.string(),
    input: z.record(z.any(), z.any()),
});

export const adminDeleteArchivedTaskSchema = z.object({
    taskId: z.string(),
});

export const adminLlmResponseSchema = z.array(z.object({
    bookApiId: z.string(),
    genres: z.array(z.string()),
}));

export const adminRefreshSchema = z.object({
    recentPage: coercedPositiveIntFieldSchema.default(1),
    topRange: z.enum(["30d", "90d", "1y", "all"]).default("all"),
    dailyRange: z.enum(["30d", "90d", "1y", "all"]).default("30d"),
});

export const adminApiMonitoringSchema = z.object({
    recentPage: coercedPositiveIntFieldSchema.default(1),
    range: z.enum(["24h", "7d", "30d", "90d", "all"]).default("30d"),
    dailyRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});
