import * as z from "zod";
import {usernameSchema} from "@/lib/schemas/common.schema";


export const MAX_PROFILE_SMART_VIEWS = 4;


export const profileSmartViewSelectionSchema = z.strictObject({
    ids: z.array(z.number().int().positive()).max(MAX_PROFILE_SMART_VIEWS)
        .refine(ids => new Set(ids).size === ids.length, "Choose each smart list once."),
});


export const profileSmartViewsSchema = z.strictObject({ username: usernameSchema });
