import * as z from "zod";
import {Status} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {movies, moviesList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements.seed";


export type Movie = typeof movies.$inferSelect;
export type MoviesList = typeof moviesList.$inferSelect;
export type MoviesListInsert = typeof moviesList.$inferInsert;
export type MoviesImportPayload = z.infer<typeof moviesImportPayloadSchema>;
export type MoviesFinalListInsert = z.infer<typeof moviesFinalListInsertSchema>;
export type MoviesAchCodeName = typeof moviesAchievements[number]["codeName"];


export type UpsertMovieWithDetails = {
    mediaData: typeof movies.$inferInsert,
    actorsData?: { name: string }[],
    genresData?: { name: string }[],
};


const emptyStringToNull = (value: unknown) => value === "" ? null : value;

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;


export const moviesFinalListInsertSchema = createInsertSchema(moviesList, {
    status: z.enum(Status),
    customCover: z.string().nullable().optional(),
});


const moviesCSVListSchema = createInsertSchema(moviesList, {
    status: z.enum(Status),
    comment: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    addedAt: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    lastUpdated: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    redo: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    total: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    rating: z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional()),
    favorite: z.preprocess((value) => {
        if (value === "") return null;
        if (typeof value !== "string") return value;

        const normalizedValue = value.trim().toLowerCase();
        if (normalizedValue === "true" || normalizedValue === "1") return true;
        if (normalizedValue === "false" || normalizedValue === "0") return false;

        return value;
    }, z.boolean().nullable().optional()),
});


export const moviesImportPayloadSchema = moviesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});


export const moviesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(moviesImportPayloadSchema.shape);
