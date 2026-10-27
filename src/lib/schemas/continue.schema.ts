import * as z from "zod";
import {mediaTabSearchSchema} from "@/lib/schemas/search.schema";
import {paginationSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export const continueSearchSchema = mediaTabSearchSchema.extend({ page: paginationSchema.shape.page });


export const continueRequestSchema = continueSearchSchema.extend({
    username: usernameFieldSchema,
    preview: z.boolean().optional(),
});


export type ContinueSearch = Partial<z.infer<typeof continueSearchSchema>>;
