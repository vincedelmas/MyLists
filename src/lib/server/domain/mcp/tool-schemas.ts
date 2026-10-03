import z from "zod";
import {TagAction} from "@/lib/utils/enums";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {tvSeasonsQuerySchema} from "@/lib/schemas/tv-seasons.schema";
import {MAX_QUERY_SQL_LENGTH, QUERY_LIMITS} from "@/lib/server/core/mcp/config";
import {editUserTagSchema, updateUserCustomCoverSchema} from "@/lib/schemas/user-media.schema";
import {mediaListSchema, mediaListFiltersSchema, mediaListSearchFiltersSchema} from "@/lib/schemas/media-lists.schema";


export const mediaListFiltersInputSchema = mediaListFiltersSchema.strict();

export const mediaListSearchFiltersInputSchema = mediaListSearchFiltersSchema.strict();

export const tvSeasonsInputSchema = tvSeasonsQuerySchema.omit({ userId: true }).strict();


export const mediaListInputSchema = mediaListSchema.omit({ username: true }).extend({
    args: mediaListSchema.shape.args.omit({ userId: true, currentUserId: true }).strict(),
}).strict();


export const mediaSearchInputSchema = navbarSearchSchema.safeExtend({
    apiProvider: navbarSearchSchema.shape.apiProvider.exclude(["USERS"]),
}).strict();


// Limit tag edits to one list entry, global rename/deletion remain website operations.
export const editMediaTagInputSchema = editUserTagSchema.extend({
    mediaId: editUserTagSchema.shape.mediaId.unwrap(),
    action: z.enum([TagAction.ADD, TagAction.DELETE_ONE]),
    tag: editUserTagSchema.shape.tag.omit({ oldName: true }).strict(),
}).strict();


// MCP accepts a cover URL. The server function validates the URL/remove combination.
export const mediaCoverInputSchema = z.object({
    remove: updateUserCustomCoverSchema.shape.remove,
    mediaId: updateUserCustomCoverSchema.shape.mediaId,
    imageUrl: updateUserCustomCoverSchema.shape.imageUrl,
    mediaType: updateUserCustomCoverSchema.shape.mediaType,
}).strict();


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
