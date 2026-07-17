import * as z from "zod";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {
    animeLibraryEntrySchema,
    bookLibraryEntrySchema,
    gameLibraryEntrySchema,
    mangaLibraryEntrySchema,
    movieLibraryEntrySchema,
    seriesLibraryEntrySchema,
} from "@/lib/contracts/media/details";
import {TvMediaType} from "@/lib/types/media-kind.types";


const communityActivityStatsSchema = z.object({
    total: z.number().int().nonnegative(),
    totalRedo: z.number().int().nonnegative(),
    likedCount: z.number().int().nonnegative(),
    totalSpecific: z.number().nonnegative(),
    totalPlaytime: z.number().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(10).nullable(),
}).strict();

const communityItem = <K extends MediaType, S extends z.ZodType>(kind: K, userMedia: S) => z.object({
    kind: z.literal(kind),
    id: z.number().int().positive(),
    name: z.string(),
    image: z.string().nullable(),
    ratingSystem: z.enum(RatingSystemType),
    userMedia,
}).strict();

const communityPage = <K extends MediaType, S extends z.ZodType>(kind: K, userMedia: S) => z.object({
    kind: z.literal(kind),
    page: z.number().int().positive(),
    items: z.array(communityItem(kind, userMedia)),
    total: z.number().int().nonnegative(),
    perPage: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
    stats: communityActivityStatsSchema,
}).strict();

const seriesCommunityActivitySchema = communityPage(MediaType.SERIES, seriesLibraryEntrySchema);
const animeCommunityActivitySchema = communityPage(MediaType.ANIME, animeLibraryEntrySchema);
const movieCommunityActivitySchema = communityPage(MediaType.MOVIES, movieLibraryEntrySchema);
const gameCommunityActivitySchema = communityPage(MediaType.GAMES, gameLibraryEntrySchema);
const bookCommunityActivitySchema = communityPage(MediaType.BOOKS, bookLibraryEntrySchema);
const mangaCommunityActivitySchema = communityPage(MediaType.MANGA, mangaLibraryEntrySchema);

export const communityActivityPageSchema = z.discriminatedUnion("kind", [
    seriesCommunityActivitySchema,
    animeCommunityActivitySchema,
    movieCommunityActivitySchema,
    gameCommunityActivitySchema,
    bookCommunityActivitySchema,
    mangaCommunityActivitySchema,
]);

export type CommunityActivityPage = z.infer<typeof communityActivityPageSchema>;
export type CommunityActivityStats = z.infer<typeof communityActivityStatsSchema>;
export type CommunityActivityItem = CommunityActivityPage["items"][number];
type SeriesCommunityActivityPage = z.infer<typeof seriesCommunityActivitySchema>;
export type MovieCommunityActivityPage = z.infer<typeof movieCommunityActivitySchema>;
export type GameCommunityActivityPage = z.infer<typeof gameCommunityActivitySchema>;
export type BookCommunityActivityPage = z.infer<typeof bookCommunityActivitySchema>;
export type MangaCommunityActivityPage = z.infer<typeof mangaCommunityActivitySchema>;
export type TvCommunityActivityPage<K extends TvMediaType> = {
    kind: K;
    page: number;
    items: Array<Omit<SeriesCommunityActivityPage["items"][number], "kind" | "userMedia"> & {
        kind: K;
        userMedia: Omit<SeriesCommunityActivityPage["items"][number]["userMedia"], "kind"> & { kind: K };
    }>;
    total: number;
    perPage: number;
    pages: number;
    stats: CommunityActivityStats;
};

export const validateCommunityActivityPage = <T extends CommunityActivityPage>(value: T): T => {
    if (process.env.NODE_ENV !== "production") communityActivityPageSchema.parse(value);
    return value;
};
