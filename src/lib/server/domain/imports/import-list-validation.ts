import * as z from "zod";
import {emptyStringToNull} from "@/lib/utils/formatting/text";
import {COMMENT_MAX_LENGTH, PLAYTIME_MAX_MINUTES, PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";


const parseImportBoolean = (value: unknown) => {
    if (typeof value !== "string") return value;

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "") return null;
    if (normalizedValue === "true" || normalizedValue === "1") return true;
    if (normalizedValue === "false" || normalizedValue === "0") return false;

    return value;
};

const emptyStringToUndefined = (value: unknown) => {
    return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const importCommentSchema = z.preprocess(
    emptyStringToNull, z.string()
        .max(COMMENT_MAX_LENGTH, `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`)
        .nullable()
        .optional()
);

export const importFavoriteSchema = z.preprocess(parseImportBoolean, z.boolean().nullable().optional());

export const importRatingSchema = z.preprocess(emptyStringToNull, z.coerce.number().min(0).max(10).nullable().optional());

export const importRedoSchema = z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(REDO_MAX).optional());

export const importTotalSchema = z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(PROGRESS_MAX).optional());

export const importProgressSchema = z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(PROGRESS_MAX).optional());

export const importPlaytimeSchema = z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(PLAYTIME_MAX_MINUTES).optional());

export const nullableImportProgressSchema = z.preprocess(emptyStringToNull, z.coerce.number().int().min(0).max(PROGRESS_MAX).nullable().optional());


export const importExternalNumericIdSchema = z.string().trim().min(1, "External media ID is required")
    .refine(value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
        "External media ID must be a positive whole number");
