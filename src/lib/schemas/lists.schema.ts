import z from "zod";
import {collectionsBrowseFiltersSchema} from "@/lib/schemas/collections.schema";
import {coercedPositiveIntFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export const listsSearchSchema = collectionsBrowseFiltersSchema.extend({
    kind: z.enum(["presets", "dynamic", "collections", "pinned"]).optional().catch(undefined),
    dynamicPage: coercedPositiveIntFieldSchema.optional().catch(undefined),
});

export const userListViewsSearchSchema = listsSearchSchema.pick({
    search: true,
    mediaType: true,
    dynamicPage: true,
}).extend({
    username: usernameFieldSchema,
    pinnedOnly: z.boolean().optional(),
});

export type UserListViewsSearch = z.infer<typeof userListViewsSearchSchema>;
