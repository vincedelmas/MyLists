import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {optionalTrimmedSearchFieldSchema, paginationSchema} from "@/lib/schemas/common.schema";


export type TasteMatchesSearch = z.infer<typeof tasteMatchesSearchSchema>;


export const tasteMatchesSearchSchema = paginationSchema.extend({
    search: optionalTrimmedSearchFieldSchema,
    sorting: z.enum(["match", "overlap"]).optional().default("match").catch("match"),
    activeTab: z.union([z.literal("all"), z.enum(MediaType)]).optional().default("all").catch("all"),
    hideFollowed: z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
        .optional().default(false).catch(false),
});
