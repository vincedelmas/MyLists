import * as z from "zod";
import {JobType, MediaType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, imageFileSchema, imageUrlSchema, mediaTypeFieldSchema, mediaTypeMediaIdSchema, paginationSchema} from "@/lib/schemas/common.schema";


export type UpdateBookCoverInput = z.input<typeof updateBookCoverSchema>;
export type EditMediaDetailsPayload = EditMediaDetailsPayloadByType[MediaType];
export type EditMediaDetailsInput = z.input<(typeof editMediaDetailsPayloadSchemas)[MediaType]>;
export type MediaEditFieldByType = { [T in MediaType]: keyof EditMediaDetailsPayloadByType[T] & string };
export type EditMediaDetailsPayloadByType = { [T in MediaType]: z.output<(typeof editMediaDetailsPayloadSchemas)[T]> };
export type MediaEditFormFieldsByType = { [T in MediaType]: Omit<EditMediaDetailsPayloadByType[T], "imageCover" | "genres"> };


export const mediaDetailsSchema = mediaTypeMediaIdSchema;

export const mediaCommunityActivitySchema = mediaDetailsSchema.extend({
    search: paginationSchema,
});

export const externalMediaResolveSchema = z.object({
    apiId: z.coerce.string(),
    mediaType: mediaTypeFieldSchema,
});

export const refreshMediaDetailsSchema = mediaTypeMediaIdSchema;

export const mediaDetailsToEditSchema = mediaTypeMediaIdSchema;


const metadataNumberSchema = z.union([z.number(), z.string().trim().min(1)])
    .pipe(z.coerce.number<string | number>().nonnegative());

const metadataTextSchema = z.string().nullable().optional();
const metadataIntegerSchema = metadataNumberSchema.pipe(z.number().int());
const blankMetadataFieldSchema = z.string().trim().length(0).transform(() => null);
const metadataDateSchema = z.union([z.iso.date(), blankMetadataFieldSchema]).nullable().optional();
const metadataUrlSchema = z.union([imageUrlSchema, blankMetadataFieldSchema]).nullable().optional();
const nullableMetadataNumberSchema = z.union([metadataNumberSchema, blankMetadataFieldSchema]).nullable().optional();


const commonEditableFields = {
    synopsis: metadataTextSchema,
    releaseDate: metadataDateSchema,
    name: z.string().trim().min(1, "Name is required.").optional(),
    imageCover: z.union([imageUrlSchema, z.string().trim().length(0).transform(() => undefined)]).optional(),
    lockStatus: z.union([
        z.boolean(),
        z.literal("true").transform(() => true),
        z.literal("false").transform(() => false),
    ]).optional(),
};


// Available validators; server definitions decide which fields are editable and their form order.
const tvEditPayloadSchema = z.strictObject({
    ...commonEditableFields,
    homepage: metadataUrlSchema,
    createdBy: metadataTextSchema,
    prodStatus: metadataTextSchema,
    lastAirDate: metadataDateSchema,
    originalName: metadataTextSchema,
    originCountry: metadataTextSchema,
    duration: metadataIntegerSchema.optional(),
});


const movieEditPayloadSchema = z.strictObject({
    ...commonEditableFields,
    tagline: metadataTextSchema,
    homepage: metadataUrlSchema,
    originalName: metadataTextSchema,
    directorName: metadataTextSchema,
    budget: nullableMetadataNumberSchema,
    originalLanguage: metadataTextSchema,
    revenue: nullableMetadataNumberSchema,
    duration: metadataIntegerSchema.optional(),
});


const gameEditPayloadSchema = z.strictObject({
    ...commonEditableFields,
    gameModes: metadataTextSchema,
    gameEngine: metadataTextSchema,
    playerPerspective: metadataTextSchema,
    hltbMainTime: nullableMetadataNumberSchema,
    hltbMainAndExtraTime: nullableMetadataNumberSchema,
    hltbTotalCompleteTime: nullableMetadataNumberSchema,
});


const bookEditPayloadSchema = z.strictObject({
    ...commonEditableFields,
    language: metadataTextSchema,
    publishers: metadataTextSchema,
    authors: z.string().optional(),
    pages: metadataIntegerSchema.optional(),
});


const mangaEditPayloadSchema = z.strictObject({
    ...commonEditableFields,
    publishers: metadataTextSchema,
    chapters: z.union([metadataIntegerSchema, blankMetadataFieldSchema]).nullable().optional(),
    genres: z.array(z.union([
        z.string().trim().min(1),
        z.strictObject({ name: z.string().trim().min(1) }),
    ])).optional(),
});


export const editMediaDetailsPayloadSchemas = {
    [MediaType.ANIME]: tvEditPayloadSchema,
    [MediaType.SERIES]: tvEditPayloadSchema,
    [MediaType.MOVIES]: movieEditPayloadSchema,
    [MediaType.GAMES]: gameEditPayloadSchema,
    [MediaType.BOOKS]: bookEditPayloadSchema,
    [MediaType.MANGA]: mangaEditPayloadSchema,
};


export const editMediaDetailsSchema = z.discriminatedUnion("mediaType", [
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.SERIES), payload: editMediaDetailsPayloadSchemas[MediaType.SERIES] }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.ANIME), payload: editMediaDetailsPayloadSchemas[MediaType.ANIME] }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.MOVIES), payload: editMediaDetailsPayloadSchemas[MediaType.MOVIES] }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.GAMES), payload: editMediaDetailsPayloadSchemas[MediaType.GAMES] }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.BOOKS), payload: editMediaDetailsPayloadSchemas[MediaType.BOOKS] }),
    mediaTypeMediaIdSchema.extend({ mediaType: z.literal(MediaType.MANGA), payload: editMediaDetailsPayloadSchemas[MediaType.MANGA] }),
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
    pagination: paginationSchema,
});


export const createMediaEditPayloadSchema = <T extends MediaType>(mediaType: T, editableFields: readonly MediaEditFieldByType[T][]) => {
    const schema: z.ZodObject<z.ZodRawShape> = editMediaDetailsPayloadSchemas[mediaType];
    const mask = Object.fromEntries(editableFields.map(field => [field, true])) as Record<string, true>;

    // Selected fields are dynamic; all catalog fields are optional in payload type
    return schema.pick(mask) as (typeof editMediaDetailsPayloadSchemas)[T];
};
