import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export type ReleaseCalendarRange = z.infer<typeof releaseCalendarRangeSchema>;
export type ReleaseCalendarSearch = z.infer<typeof releaseCalendarSearchSchema>;


export const releaseCalendarMediaTypeSchema = z.enum([
    MediaType.SERIES,
    MediaType.ANIME,
    MediaType.MOVIES,
    MediaType.GAMES,
]);


export const releaseCalendarSearchSchema = z.object({
    date: z.iso.date().optional().catch(undefined),
    view: z.enum(["month", "week"]).optional().catch(undefined),
    mediaType: releaseCalendarMediaTypeSchema.optional().catch(undefined),
});


export const releaseCalendarRangeSchema = z.object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
}).refine(({ startDate, endDate }) =>
    startDate <= endDate
    && Date.parse(endDate) - Date.parse(startDate) <= 41 * 86400000, {
    message: "Choose a date range of up to six weeks.",
});
