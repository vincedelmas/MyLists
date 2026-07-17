import * as z from "zod";
import {REDO_MAX} from "@/lib/utils/constants";
import {
    importCommentSchema,
    importFavoriteSchema,
    importRatingSchema,
} from "@/lib/server/domain/imports/import-list-validation";


export const importedCommonShape = {
    favorite: importFavoriteSchema,
    comment: importCommentSchema,
    rating: importRatingSchema,
};


export const storedCommonShape = {
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    favorite: z.boolean().nullable().optional(),
    comment: z.string().nullable().optional(),
    rating: z.number().min(0).max(10).nullable().optional(),
    customCover: z.string().nullable().optional(),
    addedAt: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
};


export const importedRedoArraySchema = z.preprocess(
    parseRedoArray,
    z.array(z.coerce.number().int().min(0).max(REDO_MAX)).optional(),
);


function parseRedoArray(value: unknown) {
    if (value === "") return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            return value;
        }
    }

    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.some((part) => part === "")) return value;
    return parts.map(Number);
}
