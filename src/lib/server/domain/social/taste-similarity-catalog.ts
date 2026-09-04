import {sql} from "drizzle-orm";
import type {MediaType} from "@/lib/utils/enums";
import type {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";


export const defineTasteSimilarityCatalog = <TDefinition extends AnyServerMediaDefinition>(definition: TDefinition) => {
    const { mediaType } = definition.identity;
    const { mediaTable, listTable } = definition.repository.tables;

    return {
        mediaType,

        buildSharedRatingsBranch(currentUserId: number) {
            return sql`
                SELECT
                    candidate.user_id AS candidate_id,
                    ${mediaType} AS media_type,
                    mine.rating AS my_rating,
                    candidate.rating AS their_rating
                FROM ${listTable} AS mine
                INNER JOIN ${listTable} AS candidate
                    ON candidate.media_id = mine.media_id
                    AND candidate.user_id <> mine.user_id
                INNER JOIN user_media_settings AS candidate_settings
                    ON candidate_settings.user_id = candidate.user_id
                    AND candidate_settings.media_type = ${mediaType}
                    AND candidate_settings.active = 1
                WHERE mine.user_id = ${currentUserId}
                    AND mine.rating IS NOT NULL
                    AND candidate.rating IS NOT NULL
            `;
        },

        buildSharedLovedMediaBranch(currentUserId: number, candidateIds: number[]) {
            const idList = sql.join(candidateIds.map((id) => sql`${id}`), sql`, `);

            return sql`
                SELECT
                    candidate.user_id AS candidate_id,
                    media.id AS media_id,
                    ${mediaType} AS media_type,
                    media.name AS name,
                    CASE WHEN mine.favorite = 1 AND candidate.favorite = 1 THEN 1 ELSE 0 END AS both_favorite,
                    MIN(mine.rating, candidate.rating) AS lowest_rating
                FROM ${listTable} AS mine
                INNER JOIN ${listTable} AS candidate
                    ON candidate.media_id = mine.media_id
                    AND candidate.user_id IN (${idList})
                INNER JOIN user_media_settings AS candidate_settings
                    ON candidate_settings.user_id = candidate.user_id
                    AND candidate_settings.media_type = ${mediaType}
                    AND candidate_settings.active = 1
                INNER JOIN ${mediaTable} AS media ON media.id = mine.media_id
                WHERE mine.user_id = ${currentUserId}
                    AND mine.rating >= 8
                    AND candidate.rating >= 8
            `;
        },
    };
};


export type TasteSimilarityCatalog = ReturnType<typeof defineTasteSimilarityCatalog>;


export type TasteSimilarityCatalogRegistry = {
    get(mediaType: MediaType): TasteSimilarityCatalog;
};
