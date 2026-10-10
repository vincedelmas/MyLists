import z from "zod";
import {userCollectionsFiltersSchema} from "@/lib/schemas/collections.schema";
import {coercedPositiveIntFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export const listsSearchSchema = userCollectionsFiltersSchema.extend({
    kind: z.enum(["presets", "dynamic", "collections"]).optional().catch(undefined),
    dynamicPage: coercedPositiveIntFieldSchema.optional().catch(undefined),
});

export const userListViewsSearchSchema = listsSearchSchema.pick({
    search: true,
    mediaType: true,
    dynamicPage: true,
}).extend({
    username: usernameFieldSchema,
});

export type UserListViewsSearch = z.infer<typeof userListViewsSearchSchema>;
