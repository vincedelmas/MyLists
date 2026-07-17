import {libraryEntry} from "@/lib/server/database/schema";


export const libraryStatsContributionBase = {
    userId: libraryEntry.userId,
    status: libraryEntry.status,
    favorite: libraryEntry.favorite,
    comment: libraryEntry.comment,
    rating: libraryEntry.rating,
};
