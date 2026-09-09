import * as z from "zod";
import {createInsertSchema} from "drizzle-zod";
import {MediaType, TvMediaType} from "@/lib/utils/enums";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {anime, animeList, series, seriesList} from "@/lib/server/database/schema";
import {type TvSeasonState, tvSeasonStatesSchema} from "@/lib/schemas/tv-seasons.schema";
import {
    importCommentSchema,
    importFavoriteSchema,
    importStatusSchema,
    importTotalSchema
} from "@/lib/server/domain/imports/import-list-validation";


type Series = typeof series.$inferSelect;
type Anime = typeof anime.$inferSelect;

type SeriesList = typeof seriesList.$inferSelect;
type AnimeList = typeof animeList.$inferSelect;

export type TvType = Series | Anime;
export type TvList = SeriesList | AnimeList;
export type TvImportPayload = z.infer<typeof tvImportPayloadSchema>;
export type TvListUpdate = TvList & { seasonChanges?: (Pick<TvSeasonState, "season"> & Partial<Pick<TvSeasonState, "rating" | "redo">>)[] };


export type UpsertTvWithDetails = {
    mediaData: typeof series.$inferInsert | typeof anime.$inferInsert,
    actorsData?: { name: string }[],
    networkData?: { name: string }[],
    genresData?: { name: string }[] | null,
    seasonsData?: { season: number, episodes: number }[],
};


export type UpdateTvWithDetails = Omit<UpsertTvWithDetails, "mediaData"> & {
    mediaData: Partial<UpsertTvWithDetails["mediaData"]> & Pick<UpsertTvWithDetails["mediaData"], "apiId">;
};


const tvListSchemaOverrides = (mediaType: TvMediaType) => ({
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    status: importStatusSchema(mediaType),
});


const seasonalImportFields = {
    firstWatchProgress: importTotalSchema.nonoptional(),
    seasons: z.preprocess((value) => {
        if (typeof value !== "string") return value;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }, tvSeasonStatesSchema),
};


const seriesCSVListSchema = createInsertSchema(seriesList, tvListSchemaOverrides(MediaType.SERIES)).extend(seasonalImportFields);


const animeCSVListSchema = createInsertSchema(animeList, tvListSchemaOverrides(MediaType.ANIME)).extend(seasonalImportFields);


const seriesFinalListInsertSchema = createInsertSchema(seriesList, {
    status: importStatusSchema(MediaType.SERIES),
    customCover: z.string().nullable().optional(),
    redo: z.number().int().min(0),
}).extend({ seasons: tvSeasonStatesSchema });


const animeFinalListInsertSchema = createInsertSchema(animeList, {
    status: importStatusSchema(MediaType.ANIME),
    customCover: z.string().nullable().optional(),
    redo: z.number().int().min(0),
}).extend({ seasons: tvSeasonStatesSchema });


const seriesImportPayloadSchema = seriesCSVListSchema.omit({
    id: true,
    redo: true,
    total: true,
    rating: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
    currentSeason: true,
    currentEpisode: true,
});


const animeImportPayloadSchema = animeCSVListSchema.omit({
    id: true,
    redo: true,
    total: true,
    rating: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
    currentSeason: true,
    currentEpisode: true,
});


export const tvImportPayloadSchema = z.union([seriesImportPayloadSchema, animeImportPayloadSchema]);


export const tvFinalListInsertSchema = z.union([seriesFinalListInsertSchema, animeFinalListInsertSchema]);


export const seriesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend({
    ...seriesImportPayloadSchema.shape,
    formatVersion: z.literal("2"),
});


export const animeMyListsCSVRowSchema = minimalMyListsCSVSchema.extend({
    ...animeImportPayloadSchema.shape,
    formatVersion: z.literal("2"),
});
