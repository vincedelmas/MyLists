import * as z from "zod";
import {YEAR_RECAP_FIRST_YEAR} from "@/lib/types/year-recap.types";
import {mediaTypeFieldSchema, usernameFieldSchema} from "@/lib/schemas/common.schema";


export const yearRecapInputSchema = z.object({
    username: usernameFieldSchema,
    year: z.coerce.number().int().min(YEAR_RECAP_FIRST_YEAR).max(2100),
    mediaType: mediaTypeFieldSchema.optional().catch(undefined),
});


export const yearRecapImageInputSchema = z.object({
    year: z.number().int().min(YEAR_RECAP_FIRST_YEAR).max(2100),
    mediaType: mediaTypeFieldSchema.optional(),
});
