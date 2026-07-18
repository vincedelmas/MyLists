import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
export {WCF_MAX_ROUNDS} from "@/lib/utils/constants";


export const WCF_MEDIA_TYPES = [MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES, MediaType.GAMES, MediaType.MANGA] as const;
export type WcfMediaType = typeof WCF_MEDIA_TYPES[number];


export const isWcfMediaType = (mediaType: MediaType): mediaType is WcfMediaType => {
    return WCF_MEDIA_TYPES.some((supportedType) => supportedType === mediaType);
};


export const startWhichCameFirstRunSchema = z.object({
    mediaTypes: z.array(z.enum(MediaType)).min(1).max(5)
        .refine((types) => !types.includes(MediaType.BOOKS), {
            message: "BOOKS is not a permitted media type for this game.",
        })
        .transform((types) => [...new Set(types)]),
});

export const answerWhichCameFirstRoundSchema = z.object({
    runId: z.number().int().positive(),
    roundId: z.number().int().positive(),
    selectedSide: z.enum(["left", "right"]),
});

export const abandonWhichCameFirstRunSchema = z.object({
    runId: z.number().int().positive(),
});
