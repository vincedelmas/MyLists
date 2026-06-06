import * as z from "zod";
import {ApiProviderType} from "@/lib/utils/enums";


export const navbarSearchSchema = z.object({
    query: z.string().trim(),
    apiProvider: z.enum(ApiProviderType),
    page: z.coerce.number().int().positive(),
});
