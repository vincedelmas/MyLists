import {getImageUrl} from "@/lib/utils/image-url";
import {MediaType, Status} from "@/lib/utils/enums";
import {asc, desc, inArray, sql, SQL} from "drizzle-orm";
import {MovieListArgs} from "@/lib/contracts/media/lists";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movieRedoCount} from "@/lib/server/domain/media/movies/library/movie-progress";
import {catalogItem, libraryEntry, movieActor, movieDetails, movieProgress} from "@/lib/server/database/schema";
import {getCommonLibraryListConditions, getLibraryListItemRelations} from "@/lib/server/domain/media/shared/library/library-shared-queries";


type HydrationItem = {
    id: number;
    status: Status;
    watchCount: number;
    imageCover: string;
    catalogItemId: number;
    customCover: string | null;
}


export const MOVIE_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Rating +",
    "Rating -",
    "TMDB Rating +",
    "TMDB Rating -",
    "Release Date +",
    "Release Date -",
    "Recently Added",
    "Recently Modified",
    "Re-Watched",
] as const;


export const buildConditions = (currentUserId: number | undefined, ownerId: number, args: MovieListArgs) => {
    const conditions = getCommonLibraryListConditions(MediaType.MOVIES, currentUserId, ownerId, args);

    if (args.langs?.length) conditions.push(inArray(movieDetails.originalLanguage, args.langs));
    if (args.directors?.length) conditions.push(inArray(movieDetails.directorName, args.directors));
    if (args.actors?.length) {
        conditions.push(inArray(
            catalogItem.id,
            getDbClient()
                .select({ catalogItemId: movieActor.catalogItemId })
                .from(movieActor)
                .where(inArray(movieActor.name, args.actors)),
        ));
    }

    return conditions;
};


export const sortExpressions = (sorting: typeof MOVIE_LIST_SORTS[number]): SQL[] => {
    const name = asc(catalogItem.name);
    const itemId = asc(catalogItem.id);

    const rewatches = sql<number>`CASE WHEN ${libraryEntry.status} = 'Completed' THEN MAX(${movieProgress.watchCount} - 1, 0) ELSE 0 END`;

    const sorts: Record<typeof sorting, SQL[]> = {
        "Title A-Z": [name, itemId],
        "Title Z-A": [desc(catalogItem.name), itemId],
        "Rating +": [desc(libraryEntry.rating), name, itemId],
        "Rating -": [asc(libraryEntry.rating), name, itemId],
        "TMDB Rating +": [desc(movieDetails.voteAverage), name, itemId],
        "TMDB Rating -": [asc(movieDetails.voteAverage), name, itemId],
        "Release Date +": [desc(catalogItem.releaseDate), name, itemId],
        "Release Date -": [sql`${catalogItem.releaseDate} ASC NULLS LAST`, name, itemId],
        "Recently Added": [desc(libraryEntry.addedAt), name, itemId],
        "Recently Modified": [desc(libraryEntry.updatedAt), name, itemId],
        "Re-Watched": [desc(rewatches), name, itemId],
    };

    return sorts[sorting];
};


export const hydrateItems = async <TRow extends HydrationItem>(rows: TRow[], currentUserId: number | undefined, ownerId: number) => {
    if (rows.length === 0) return [];

    const entryIds = rows.map(({ id }) => id);
    const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
    const { tags, commonIds } = await getLibraryListItemRelations(entryIds, catalogItemIds, currentUserId, ownerId);

    return rows.map(({ catalogItemId, watchCount, imageCover, customCover, ...row }) => {
        if (row.status !== Status.COMPLETED && row.status !== Status.PLAN_TO_WATCH) {
            throw new Error(`Invalid movie library status: ${row.status}`);
        }

        const progress = {
            watchCount,
            status: row.status === Status.COMPLETED ? Status.COMPLETED : Status.PLAN_TO_WATCH,
        };

        return {
            ...row,
            watchCount,
            kind: MediaType.MOVIES,
            common: commonIds.has(catalogItemId),
            rewatchCount: movieRedoCount(progress),
            imageCover: getImageUrl("movies-covers", customCover ?? imageCover),
            customCover: customCover ? getImageUrl("movies-covers", customCover) : null,
            tags: tags
                .filter((tag) => tag.libraryEntryId === row.id)
                .map(({ id, name: tagName }) => ({ id, name: tagName })),
        };
    });
};
