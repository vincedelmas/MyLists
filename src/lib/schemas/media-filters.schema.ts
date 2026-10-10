import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createMediaFiltersSchema} from "@/lib/media-definitions/base/media-filters";
import {ALL_MEDIA_TYPES, getMediaDefinition, type MediaMetadataFilters} from "@/lib/media-definitions/definition.registry";


export const mediaTagMatchingSchema = z.enum(["any", "all"]);
export type ScopedMediaFilterValues = MediaMetadataFilters & Pick<z.infer<ReturnType<typeof createScopedMediaFiltersSchema>>, "genres" | "tags" | "tagsMatch" | "excludeTags">;
export type ScopedMediaArrayFilterKey = Exclude<keyof ScopedMediaFilterValues, "tagsMatch">;

export type ScopedMediaFilters = z.infer<typeof scopedMediaFiltersSchema>;


const createScopedMediaFiltersSchema = <Type extends MediaType>(mediaType: Type) => {
    const { common, metadata } = getMediaDefinition(mediaType).filters;
    return createMediaFiltersSchema(metadata).extend(createMediaFiltersSchema({
        genres: common.genres,
        tags: common.tags,
        excludeTags: common.tags,
        tagsMatch: mediaTagMatchingSchema,
    }).shape);
};


export const scopedMediaFiltersSchema = z.strictObject(Object.fromEntries(
    ALL_MEDIA_TYPES.map(mediaType => [mediaType, createScopedMediaFiltersSchema(mediaType).optional()]),
) as {
    [Type in MediaType]: z.ZodOptional<ReturnType<typeof createScopedMediaFiltersSchema<Type>>>;
});
