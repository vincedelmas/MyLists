import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export const getUserStatsSchema = z.object({
    mediaType: z.enum(MediaType).optional(),
});
