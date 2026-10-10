import * as z from "zod";
import {Status} from "@/lib/utils/enums";


export type MediaFilterSchemas = Readonly<Record<string, z.ZodArray<z.ZodType<string>>>>;


export const MAX_MEDIA_FILTER_VALUES = 20;


export const mediaFilterNamesSchema = z.array(z.string().trim().min(1).max(100)).max(MAX_MEDIA_FILTER_VALUES);


export const mediaRatingFilterSchema = z.number().min(0).max(10);


export const commonMediaFilters = {
    search: z.string(),
    status: z.enum(Status),
    tags: mediaFilterNamesSchema,
    genres: mediaFilterNamesSchema,
    favorite: z.boolean(),
    comment: z.boolean(),
    minRating: z.coerce.number().pipe(mediaRatingFilterSchema),
};


export const createMediaFiltersSchema = <const TSchemas extends Readonly<Record<string, z.ZodType>>>(schemas: TSchemas) => {
    return z.strictObject(
        Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, schema.optional()])) as {
            [Key in keyof TSchemas]: z.ZodOptional<TSchemas[Key]>;
        },
    );
}
