import * as z from "zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {COMMENT_MAX_LENGTH, PLAYTIME_MAX_MINUTES, PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";


const parseImportBoolean = (value: unknown) => {
    if (typeof value !== "string") return value;

    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "") return null;
    if (normalizedValue === "true" || normalizedValue === "1") return true;
    if (normalizedValue === "false" || normalizedValue === "0") return false;

    return value;
};

const emptyStringToUndefined = (value: unknown) => typeof value === "string" && value.trim() === "" ? undefined : value;

export const emptyStringToNull = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;

export const importStatusSchema = (mediaType: MediaType) => {
    const allowedStatuses: Status[] = statusUtils.byMediaType(mediaType);

    return z.enum(Status).refine((status) => allowedStatuses.includes(status), {
        message: `Status is not valid for ${mediaType}. Allowed statuses: ${allowedStatuses.join(", ")}`,
    });
};

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

export const importPositiveProgressSchema = z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).max(PROGRESS_MAX).optional());

export const nullableImportProgressSchema = z.preprocess(emptyStringToNull, z.coerce.number().int().min(0).max(PROGRESS_MAX).nullable().optional());
