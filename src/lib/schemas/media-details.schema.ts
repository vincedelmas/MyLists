import * as z from "zod";
import {JobType, type MediaType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import {animeDefinition} from "@/lib/media-definitions/tv/anime/anime.definition";
import {mediaCatalogBrowseFiltersSchema} from "@/lib/schemas/media-browse.schema";
import {seriesDefinition} from "@/lib/media-definitions/tv/series/series.definition";
import {
    coercedPositiveIntFieldSchema,
    imageFileSchema,
    imageUrlSchema,
    mediaTypeFieldSchema,
    mediaTypeMediaIdSchema,
    simpleSearchSchema
} from "@/lib/schemas/common.schema";


export type UpdateBookCoverInput = z.input<typeof updateBookCoverSchema>;
export type EditMediaDetailsInput = z.input<MediaMetadataSchemas[MediaType]>;
export type EditMediaDetailsPayload = EditMediaDetailsPayloadByType[MediaType];
export type EditMediaDetailsPayloadByType = { [T in MediaType]: z.output<MediaMetadataSchemas[T]> };
export type MediaEditFieldByType = { [T in MediaType]: keyof EditMediaDetailsPayloadByType[T] & string };
type MediaMetadataSchemas = { [T in MediaType]: ReturnType<typeof getMediaDefinition<T>>["metadataSchema"] };


export const mediaDetailsSchema = mediaTypeMediaIdSchema;

export const refreshMediaDetailsSchema = mediaTypeMediaIdSchema;

export const mediaDetailsToEditSchema = mediaTypeMediaIdSchema;


export const mediaCommunityActivitySchema = mediaDetailsSchema.extend({
    search: simpleSearchSchema,
});


export const externalMediaResolveSchema = z.object({
    apiId: z.coerce.string(),
    mediaType: mediaTypeFieldSchema,
});


export const editMediaDetailsSchema = z.discriminatedUnion("mediaType", [
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(seriesDefinition.identity.mediaType), payload: seriesDefinition.metadataSchema }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(animeDefinition.identity.mediaType), payload: animeDefinition.metadataSchema }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(moviesDefinition.identity.mediaType), payload: moviesDefinition.metadataSchema }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(gamesDefinition.identity.mediaType), payload: gamesDefinition.metadataSchema }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(booksDefinition.identity.mediaType), payload: booksDefinition.metadataSchema }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(mangaDefinition.identity.mediaType), payload: mangaDefinition.metadataSchema }),
]);


export const updateBookCoverSchema = z.object({
    imageUrl: imageUrlSchema.optional(),
    imageFile: imageFileSchema.optional(),
    mediaId: coercedPositiveIntFieldSchema,
}).superRefine((data, ctx) => {
    const addFieldIssues = (message: string) => {
        ctx.addIssue({ code: "custom", message, path: ["imageUrl"] });
        ctx.addIssue({ code: "custom", message, path: ["imageFile"] });
    };

    if (!data.imageUrl && !data.imageFile) {
        addFieldIssues("Provide an image link or upload a file.");
    }
    if (data.imageUrl && data.imageFile) {
        addFieldIssues("Please, choose only one cover option.");
    }
});


export const mediaDetailsJobSchema = z.object({
    name: z.string(),
    job: z.enum(JobType),
    mediaType: mediaTypeFieldSchema,
})


export const jobDetailsSchema = mediaDetailsJobSchema.extend({
    filters: mediaCatalogBrowseFiltersSchema.strict(),
});


export const createMediaEditPayloadSchema = <T extends MediaType>(mediaType: T, editableFields: readonly MediaEditFieldByType[T][]) => {
    const schema: z.ZodObject<z.ZodRawShape> = getMediaDefinition(mediaType).metadataSchema;
    const mask = Object.fromEntries(editableFields.map(field => [field, true])) as Record<string, true>;

    // Selected fields are dynamic; all catalog fields are optional in payload type
    return schema.pick(mask) as MediaMetadataSchemas[T];
};
