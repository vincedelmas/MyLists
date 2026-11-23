import {alias} from "drizzle-orm/sqlite-core";
import {MediaCategory} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, desc, eq, inArray, isNull, ne, or, sql, type SQL} from "drizzle-orm";
import {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";


const SIMILAR_LIMIT = 10;
const CREATOR_BONUS = 0.35;
const VOTE_DAMPING_PRIOR = 100;
const MAX_GENRE_CANDIDATES = 150;
const MAX_CREATOR_CANDIDATES = 40;


const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");


export const findSimilarMedia = async <TDef extends AnyServerMediaDefinition>(definition: TDef, mediaId: number) => {
    const db = getDbClient();
    const { repository: { tables: { mediaTable, listTable, genreTable }, categories } } = definition;

    const targetMeta = mediaTable.collectionId
        ? db
            .select({ collectionId: mediaTable.collectionId })
            .from(mediaTable)
            .where(eq(mediaTable.id, mediaId))
            .get()
        : undefined;

    const excludeCollectionId = targetMeta?.collectionId ?? null;

    const targetGenres = db
        .select({ name: genreTable.name })
        .from(genreTable)
        .where(eq(genreTable.mediaId, mediaId))
        .all()
        .map(row => row.name);

    const creatorMatches = new Set<number>();
    const genreScores = new Map<number, number>();

    const excludeSameCollection = excludeCollectionId !== null && mediaTable.collectionId
        ? or(isNull(mediaTable.collectionId), ne(mediaTable.collectionId, excludeCollectionId))
        : undefined;

    const qualityScore = mediaTable.voteAverage && mediaTable.voteCount
        ? sql<number>`COALESCE(${mediaTable.voteAverage}, 0) * (CAST(COALESCE(${mediaTable.voteCount}, 0) AS REAL) / (COALESCE(${mediaTable.voteCount}, 0) + ${VOTE_DAMPING_PRIOR}))`
        : sql<number>`(SELECT COUNT(*) FROM ${listTable} WHERE ${listTable.mediaId} = ${mediaTable.id})`;

    if (targetGenres.length > 0) {
        const sharedGenres = db
            .select({ mediaId: genreTable.mediaId, shared: count(genreTable.name).as("shared") })
            .from(genreTable)
            .where(and(ne(genreTable.mediaId, mediaId), inArray(genreTable.name, targetGenres)))
            .groupBy(genreTable.mediaId)
            .as("shared_genres");

        const allGenres = alias(genreTable, "all_genres");

        const genreTotal = db.select({ total: count() })
            .from(allGenres)
            .where(eq(allGenres.mediaId, sharedGenres.mediaId));

        const overlap = sql<number>`CAST(${sharedGenres.shared} AS REAL) / (${targetGenres.length} + (${genreTotal}) - ${sharedGenres.shared})`;

        const genreRows = db
            .select({ mediaId: sharedGenres.mediaId, overlap })
            .from(sharedGenres)
            .innerJoin(mediaTable, eq(mediaTable.id, sharedGenres.mediaId))
            .where(excludeSameCollection)
            .orderBy(desc(overlap), desc(qualityScore), mediaTable.name, mediaTable.id)
            .limit(MAX_GENRE_CANDIDATES)
            .all();

        for (const row of genreRows) {
            genreScores.set(row.mediaId, row.overlap);
        }
    }

    const creatorCategory = categories[MediaCategory.CREATOR];
    if (creatorCategory) {
        if (creatorCategory.sourceTable === mediaTable) {
            const targetCreator = db
                .select({ name: creatorCategory.nameColumn })
                .from(mediaTable)
                .where(eq(mediaTable.id, mediaId))
                .get()?.name;

            if (targetCreator) {
                const creatorNames = targetCreator
                    .split(",")
                    .map(name => name.trim())
                    .filter(Boolean)
                    .slice(0, 4);

                if (creatorNames.length > 0) {
                    const matchConditions = creatorNames.map(name => {
                        const escaped = escapeLike(name);
                        return sql`(',' || REPLACE(${creatorCategory.nameColumn}, ', ', ',') || ',') LIKE ${`%,${escaped},%`} ESCAPE '\\'`;
                    });

                    const creatorRows = db
                        .select({ mediaId: mediaTable.id })
                        .from(mediaTable)
                        .where(and(ne(mediaTable.id, mediaId), excludeSameCollection, or(...matchConditions)))
                        .orderBy(desc(qualityScore), mediaTable.name, mediaTable.id)
                        .limit(MAX_CREATOR_CANDIDATES)
                        .all();

                    for (const row of creatorRows) {
                        creatorMatches.add(row.mediaId);
                    }
                }
            }
        }
        else {
            const { sourceTable, nameColumn, mediaIdColumn } = creatorCategory;
            const devCol = "developer" in sourceTable ? (sourceTable as unknown as { developer: SQL }).developer : undefined;

            const targetNames = db
                .select({ name: nameColumn })
                .from(sourceTable)
                .where(and(eq(mediaIdColumn, mediaId), devCol ? eq(devCol, true) : undefined))
                .all()
                .map(row => row.name)
                .filter((name): name is string => Boolean(name));

            if (targetNames.length > 0) {
                const creatorRows = db
                    .selectDistinct({ mediaId: mediaIdColumn })
                    .from(sourceTable)
                    .innerJoin(mediaTable, eq(mediaTable.id, mediaIdColumn))
                    .where(and(
                        ne(mediaIdColumn, mediaId),
                        excludeSameCollection,
                        inArray(nameColumn, targetNames),
                        devCol ? eq(devCol, true) : undefined,
                    ))
                    .orderBy(desc(qualityScore), mediaTable.name, mediaTable.id)
                    .limit(MAX_CREATOR_CANDIDATES)
                    .all();

                for (const row of creatorRows) {
                    creatorMatches.add(row.mediaId);
                }
            }
        }
    }

    const candidateIds = [...new Set([...genreScores.keys(), ...creatorMatches])];
    if (candidateIds.length === 0) return [];

    if (targetGenres.length > 0) {
        const missingGenreIds = [...creatorMatches].filter(id => !genreScores.has(id));
        if (missingGenreIds.length > 0) {
            const genreTotals = db
                .select({
                    mediaId: genreTable.mediaId,
                    total: count(genreTable.name),
                    shared: sql<number>`SUM(CASE WHEN ${inArray(genreTable.name, targetGenres)} THEN 1 ELSE 0 END)`,
                }).from(genreTable)
                .where(inArray(genreTable.mediaId, missingGenreIds))
                .groupBy(genreTable.mediaId)
                .all();

            for (const row of genreTotals) {
                if (row.shared > 0) {
                    const union = targetGenres.length + row.total - row.shared;
                    genreScores.set(row.mediaId, row.shared / union);
                }
            }
        }
    }

    const metaRows = db
        .select({
            mediaId: mediaTable.id,
            mediaName: mediaTable.name,
            mediaCover: mediaTable.imageCover,
            releaseDate: mediaTable.releaseDate,
            qualityScore,
            ...(mediaTable.collectionId ? { collectionId: mediaTable.collectionId } : {}),
        }).from(mediaTable)
        .where(and(inArray(mediaTable.id, candidateIds), excludeSameCollection))
        .all();

    const ranked = metaRows
        .map(row => ({
            ...row,
            score: (genreScores.get(row.mediaId) ?? 0) + (creatorMatches.has(row.mediaId) ? CREATOR_BONUS : 0),
        })).sort((a, b) => b.score - a.score
            || b.qualityScore - a.qualityScore
            || a.mediaName.localeCompare(b.mediaName)
            || a.mediaId - b.mediaId);

    const results: { mediaId: number; mediaName: string; mediaCover: string; releaseDate: string | null }[] = [];
    const seenCollections = new Set<number>();

    for (const row of ranked) {
        const collectionId = "collectionId" in row ? row.collectionId : null;
        if (collectionId !== null && collectionId !== undefined) {
            if (seenCollections.has(collectionId)) continue;
            seenCollections.add(collectionId);
        }

        results.push({
            mediaId: row.mediaId,
            mediaName: row.mediaName,
            mediaCover: row.mediaCover,
            releaseDate: row.releaseDate,
        });

        if (results.length === SIMILAR_LIMIT) break;
    }

    return results;
};
