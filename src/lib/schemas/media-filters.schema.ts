import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createMediaFiltersSchema} from "@/lib/media-definitions/base/media-filters";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";


export type ScopedMediaFilters = z.infer<typeof scopedMediaFiltersSchema>;


export const scopedMediaFiltersSchema = z.strictObject(Object.fromEntries(
    ALL_MEDIA_TYPES.map(mediaType => [mediaType, createMediaFiltersSchema(getMediaDefinition(mediaType).filters.metadata).optional()]),
) as {
    [Type in MediaType]: z.ZodOptional<ReturnType<typeof createMediaFiltersSchema<ReturnType<typeof getMediaDefinition<Type>>["filters"]["metadata"]>>>;
});
