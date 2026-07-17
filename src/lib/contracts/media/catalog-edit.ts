import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


const optionalString = z.string().trim().nullable().optional();
const optionalRequiredString = z.string().trim().min(1).optional();
const optionalCover = z.url().trim().optional();
const optionalBoolean = z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === true || value === "true" || value === 1) return true;
    if (value === false || value === "false" || value === 0) return false;
    return value;
}, z.boolean().optional());
const optionalNonNegativeNumber = z.preprocess(
    (value) => value === undefined || value === "" ? undefined : value,
    z.coerce.number().finite().nonnegative().optional(),
);
const optionalNullableNonNegativeNumber = z.preprocess(
    (value) => value === undefined ? undefined : value === "" || value === null ? null : value,
    z.coerce.number().finite().nonnegative().nullable().optional(),
);
const namedRelationSchema = z.object({ name: z.string().trim().min(1) }).strict();

const commonCatalogPayload = {
    name: optionalRequiredString,
    releaseDate: optionalString,
    synopsis: optionalString,
    lockStatus: optionalBoolean,
    imageCover: optionalCover,
};

export const tvCatalogEditPayloadSchema = z.object({
    ...commonCatalogPayload,
    originalName: optionalString,
    lastAirDate: optionalString,
    homepage: optionalString,
    createdBy: optionalString,
    duration: optionalNonNegativeNumber,
    originCountry: optionalString,
    prodStatus: optionalString,
}).strict();

export const movieCatalogEditPayloadSchema = z.object({
    ...commonCatalogPayload,
    originalName: optionalString,
    directorName: optionalString,
    duration: optionalNonNegativeNumber,
    budget: optionalNullableNonNegativeNumber,
    revenue: optionalNullableNonNegativeNumber,
    tagline: optionalString,
    originalLanguage: optionalString,
    homepage: optionalString,
}).strict();

export const gameCatalogEditPayloadSchema = z.object({
    ...commonCatalogPayload,
    gameEngine: optionalString,
    gameModes: optionalString,
    playerPerspective: optionalString,
    hltbMainTime: optionalNullableNonNegativeNumber,
    hltbMainAndExtraTime: optionalNullableNonNegativeNumber,
    hltbTotalCompleteTime: optionalNullableNonNegativeNumber,
}).strict();

export const bookCatalogEditPayloadSchema = z.object({
    ...commonCatalogPayload,
    pages: optionalNonNegativeNumber,
    language: optionalString,
    publishers: optionalString,
    authors: z.array(namedRelationSchema).optional(),
}).strict();

export const mangaCatalogEditPayloadSchema = z.object({
    ...commonCatalogPayload,
    chapters: optionalNullableNonNegativeNumber,
    publishers: optionalString,
    genres: z.array(namedRelationSchema).optional(),
}).strict();

const requestBase = { mediaId: z.coerce.number().int().positive() };

export const catalogEditRequestSchema = z.discriminatedUnion("mediaType", [
    z.object({ ...requestBase, mediaType: z.literal(MediaType.SERIES), payload: tvCatalogEditPayloadSchema }).strict(),
    z.object({ ...requestBase, mediaType: z.literal(MediaType.ANIME), payload: tvCatalogEditPayloadSchema }).strict(),
    z.object({ ...requestBase, mediaType: z.literal(MediaType.MOVIES), payload: movieCatalogEditPayloadSchema }).strict(),
    z.object({ ...requestBase, mediaType: z.literal(MediaType.GAMES), payload: gameCatalogEditPayloadSchema }).strict(),
    z.object({ ...requestBase, mediaType: z.literal(MediaType.BOOKS), payload: bookCatalogEditPayloadSchema }).strict(),
    z.object({ ...requestBase, mediaType: z.literal(MediaType.MANGA), payload: mangaCatalogEditPayloadSchema }).strict(),
]);

const catalogEditFieldsBase = {
    name: z.string(),
    releaseDate: z.string().nullable(),
    synopsis: z.string().nullable(),
    lockStatus: z.boolean(),
};

const catalogEditFields = <K extends MediaType, S extends z.ZodRawShape>(kind: K, fields: S) => z.object({
    kind: z.literal(kind),
    fields: z.object({ ...catalogEditFieldsBase, ...fields }).strict(),
}).strict();

const seriesCatalogEditFieldsSchema = catalogEditFields(MediaType.SERIES, {
    originalName: z.string().nullable(),
    lastAirDate: z.string().nullable(),
    homepage: z.string().nullable(),
    createdBy: z.string().nullable(),
    duration: z.number().nonnegative(),
    originCountry: z.string().nullable(),
    prodStatus: z.string().nullable(),
});
const animeCatalogEditFieldsSchema = catalogEditFields(MediaType.ANIME, {
    originalName: z.string().nullable(),
    lastAirDate: z.string().nullable(),
    homepage: z.string().nullable(),
    createdBy: z.string().nullable(),
    duration: z.number().nonnegative(),
    originCountry: z.string().nullable(),
    prodStatus: z.string().nullable(),
});
const movieCatalogEditFieldsSchema = catalogEditFields(MediaType.MOVIES, {
    originalName: z.string().nullable(),
    directorName: z.string().nullable(),
    duration: z.number().nonnegative(),
    budget: z.number().nonnegative().nullable(),
    revenue: z.number().nonnegative().nullable(),
    tagline: z.string().nullable(),
    originalLanguage: z.string().nullable(),
    homepage: z.string().nullable(),
});
const gameCatalogEditFieldsSchema = catalogEditFields(MediaType.GAMES, {
    gameEngine: z.string().nullable(),
    gameModes: z.string().nullable(),
    playerPerspective: z.string().nullable(),
    hltbMainTime: z.number().nonnegative().nullable(),
    hltbMainAndExtraTime: z.number().nonnegative().nullable(),
    hltbTotalCompleteTime: z.number().nonnegative().nullable(),
});
const bookCatalogEditFieldsSchema = catalogEditFields(MediaType.BOOKS, {
    pages: z.number().nonnegative(),
    language: z.string().nullable(),
    publishers: z.string().nullable(),
    authors: z.array(namedRelationSchema),
});
const mangaCatalogEditFieldsSchema = catalogEditFields(MediaType.MANGA, {
    chapters: z.number().nonnegative().nullable(),
    publishers: z.string().nullable(),
    genres: z.array(namedRelationSchema),
});

export const catalogEditFieldsSchema = z.discriminatedUnion("kind", [
    seriesCatalogEditFieldsSchema,
    animeCatalogEditFieldsSchema,
    movieCatalogEditFieldsSchema,
    gameCatalogEditFieldsSchema,
    bookCatalogEditFieldsSchema,
    mangaCatalogEditFieldsSchema,
]);

export type CatalogEditFields = z.infer<typeof catalogEditFieldsSchema>;
export type TvCatalogEditPayloadInput = z.input<typeof tvCatalogEditPayloadSchema>;
export type TvCatalogEditPayload = z.output<typeof tvCatalogEditPayloadSchema>;
export type MovieCatalogEditPayloadInput = z.input<typeof movieCatalogEditPayloadSchema>;
export type MovieCatalogEditPayload = z.output<typeof movieCatalogEditPayloadSchema>;
export type GameCatalogEditPayloadInput = z.input<typeof gameCatalogEditPayloadSchema>;
export type GameCatalogEditPayload = z.output<typeof gameCatalogEditPayloadSchema>;
export type BookCatalogEditPayloadInput = z.input<typeof bookCatalogEditPayloadSchema>;
export type BookCatalogEditPayload = z.output<typeof bookCatalogEditPayloadSchema>;
export type MangaCatalogEditPayloadInput = z.input<typeof mangaCatalogEditPayloadSchema>;
export type MangaCatalogEditPayload = z.output<typeof mangaCatalogEditPayloadSchema>;
