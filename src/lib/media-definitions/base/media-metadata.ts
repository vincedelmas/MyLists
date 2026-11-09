import * as z from "zod";
import {imageUrlSchema} from "@/lib/schemas/common.schema";


const metadataNumberSchema = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number<string | number>().nonnegative());

export const metadataTextSchema = z.string().nullable().optional();

export const metadataIntegerSchema = metadataNumberSchema.pipe(z.number().int());

export const blankMetadataFieldSchema = z.string().trim().length(0).transform(() => null);

export const metadataDateSchema = z.union([z.iso.date(), blankMetadataFieldSchema]).nullable().optional();

export const metadataUrlSchema = z.union([imageUrlSchema, blankMetadataFieldSchema]).nullable().optional();

export const nullableMetadataNumberSchema = z.union([metadataNumberSchema, blankMetadataFieldSchema]).nullable().optional();


export const commonEditableFields = {
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
