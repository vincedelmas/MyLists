import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {movies, moviesList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements.seed";
import {
    importCommentSchema,
    importFavoriteSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Movie = typeof movies.$inferSelect;
export type MoviesList = typeof moviesList.$inferSelect;
export type MoviesImportPayload = z.infer<typeof moviesImportPayloadSchema>;
export type MoviesAchCodeName = typeof moviesAchievements[number]["codeName"];


export type UpsertMovieWithDetails = {
    mediaData: typeof movies.$inferInsert,
    actorsData?: { name: string }[],
    genresData?: { name: string }[],
};


export const moviesFinalListInsertSchema = createInsertSchema(moviesList, {
    status: importStatusSchema(MediaType.MOVIES),
    customCover: z.string().nullable().optional(),
});


const moviesCSVListSchema = createInsertSchema(moviesList, {
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    status: importStatusSchema(MediaType.MOVIES),
});


export const moviesImportPayloadSchema = moviesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});


export const moviesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(moviesImportPayloadSchema.shape);
