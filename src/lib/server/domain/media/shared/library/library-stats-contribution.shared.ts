import {libraryEntry} from "@/lib/server/database/schema";


export const libraryStatsContributionBase = {
    userId: libraryEntry.userId,
    status: libraryEntry.status,
    rating: libraryEntry.rating,
    comment: libraryEntry.comment,
    favorite: libraryEntry.favorite,
};
