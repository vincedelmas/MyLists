import z from "zod";
import {TagAction} from "@/lib/utils/enums";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {mediaListSchema} from "@/lib/schemas/media-lists.schema";
import {editUserTagSchema} from "@/lib/schemas/user-media.schema";
import {positiveIntFieldSchema} from "@/lib/schemas/common.schema";
import {tvSeasonsQuerySchema} from "@/lib/schemas/tv-seasons.schema";
import {MAX_QUERY_SQL_LENGTH, QUERY_LIMITS} from "@/lib/utils/mcp/query-limits";


export type AdminBooksForGroupingInput = z.infer<typeof adminBooksForGroupingInputSchema>;
export type AdminProposeBookMergesInput = z.infer<typeof adminProposeBookMergesInputSchema>;
export type AdminMarkBooksReviewedInput = z.infer<typeof adminMarkBooksReviewedInputSchema>;
export type AdminListBookMergeSuggestionsInput = z.infer<typeof adminListBookMergeSuggestionsInputSchema>;


export const tvSeasonsInputSchema = tvSeasonsQuerySchema.omit({ userId: true });


export const mediaListInputSchema = mediaListSchema.omit({ username: true }).extend({
    args: mediaListSchema.shape.args.omit({ userId: true, currentUserId: true }).strict(),
});


export const mediaSearchInputSchema = navbarSearchSchema.safeExtend({
    apiProvider: navbarSearchSchema.shape.apiProvider.exclude(["USERS"]),
});


// Limit tag edits to one list entry, global rename/deletion remain website operations.
export const editMediaTagInputSchema = editUserTagSchema.safeExtend({
    mediaId: editUserTagSchema.shape.mediaId.unwrap(),
    action: z.enum([TagAction.ADD, TagAction.DELETE_ONE]),
    tag: editUserTagSchema.shape.tag.omit({ oldName: true }).strict(),
});


export const myListsQueryInputSchema = z.object({
    action: z.enum(["schema", "sql"]),
    maxRows: z.number().int().min(1).max(QUERY_LIMITS.maxRows).optional(),
    sql: z.string().trim().min(1).max(MAX_QUERY_SQL_LENGTH).optional(),
    parameters: z.record(
        z.string().max(100).regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Parameter keys must be bare names such as minimum_rating."),
        z.union([z.string().max(20_000), z.number(), z.null()]),
    ).refine(parameters => Object.keys(parameters).length <= 100, "Provide at most 100 parameters.").optional(),
}).strict().superRefine((data, ctx) => {
    if (data.action === "sql" && !data.sql) {
        ctx.addIssue({ code: "custom", path: ["sql"], message: "Provide a SELECT query for action=sql." });
    }

    if (data.action === "schema") {
        for (const field of ["sql", "parameters", "maxRows"] as const) {
            if (data[field] !== undefined) {
                ctx.addIssue({ code: "custom", path: [field], message: "SQL options require action=sql." });
            }
        }
    }
});


export const adminBooksForGroupingInputSchema = z.object({
    includeReviewed: z.boolean().default(false),
    page: z.number().int().min(1).default(1),
    cursor: positiveIntFieldSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    query: z.string().trim().min(1).max(200).optional(),
    author: z.string().trim().min(1).max(200).optional(),
    mode: z.enum(["authors", "unreviewed", "search"]).default("authors"),
}).strict().superRefine((data, ctx) => {
    if (data.mode === "search" && !data.query) {
        ctx.addIssue({ code: "custom", path: ["query"], message: "Provide a search query for mode=search." });
    }
    if (data.mode === "unreviewed" && data.page > 1) {
        ctx.addIssue({ code: "custom", path: ["page"], message: "Use cursor (nextCursor) instead of page for mode=unreviewed." });
    }
    if (data.mode !== "unreviewed" && data.cursor !== undefined) {
        ctx.addIssue({ code: "custom", path: ["cursor"], message: "cursor is only supported for mode=unreviewed." });
    }
});


const adminBookMergeProposalSchema = z.object({
    targetBookId: positiveIntFieldSchema,
    confidence: z.enum(["high", "medium", "low"]),
    reason: z.string().trim().min(1).max(500),
    sourceBookIds: z.array(positiveIntFieldSchema).min(1).max(50),
}).strict().superRefine((data, ctx) => {
    if (data.sourceBookIds.includes(data.targetBookId)) {
        ctx.addIssue({ code: "custom", path: ["sourceBookIds"], message: "Target book cannot also be a source book." });
    }
    if (new Set(data.sourceBookIds).size !== data.sourceBookIds.length) {
        ctx.addIssue({ code: "custom", path: ["sourceBookIds"], message: "Duplicate source books selected." });
    }
});


export const adminProposeBookMergesInputSchema = z.object({
    markReviewedBookIds: z.array(positiveIntFieldSchema).max(500).optional(),
    proposals: z.array(adminBookMergeProposalSchema).min(1).max(50),
}).strict();


export const adminMarkBooksReviewedInputSchema = z.object({
    reset: z.boolean().optional(),
    bookIds: z.array(positiveIntFieldSchema).min(1).max(500).optional(),
}).strict().superRefine((data, ctx) => {
    if (data.reset && data.bookIds) {
        ctx.addIssue({ code: "custom", path: ["reset"], message: "Provide either bookIds or reset=true, not both." });
    }
    if (!data.reset && !data.bookIds) {
        ctx.addIssue({ code: "custom", path: ["bookIds"], message: "Provide bookIds to mark as reviewed, or set reset=true." });
    }
});


export const adminListBookMergeSuggestionsInputSchema = z.object({
    limit: z.number().int().min(1).max(100).default(50),
    status: z.enum(["pending", "dismissed", "all"]).default("pending"),
}).strict();
