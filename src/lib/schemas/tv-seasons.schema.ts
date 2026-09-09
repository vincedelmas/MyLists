import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";


export type TvSeasonState = z.infer<typeof tvSeasonStateSchema>;
export type TvSeasonDetails = TvSeasonState & { episodes: number | null };


export const tvSeasonStateSchema = z.object({
    redo: z.number().int().min(0).max(REDO_MAX),
    season: z.number().int().min(1).max(PROGRESS_MAX),
    rating: z.number().min(0).max(10).nullable(),
});


export const tvSeasonStatesSchema = z.array(tvSeasonStateSchema)
    .max(PROGRESS_MAX)
    .refine((seasons) => new Set(seasons.map(s => s.season)).size === seasons.length, "Duplicate season numbers.");


export const tvSeasonsQuerySchema = z.object({
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    mediaType: z.enum([MediaType.SERIES, MediaType.ANIME]),
});
