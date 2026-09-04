import {and, eq, inArray, sql, sum} from "drizzle-orm";
import type {MediaType, SocialState} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {followers, user, userMediaSettings} from "@/lib/server/database/schema";
import type {TasteSimilarityCatalogRegistry} from "@/lib/server/domain/social/taste-similarity-catalog";


type SharedLovedMediaRow = {
    name: string;
    mediaId: number;
    candidateId: number;
    mediaType: MediaType;
};


type CandidateAggregateRow = {
    count: number;
    sumMine: number;
    sumTheirs: number;
    sumProduct: number;
    candidateId: number;
    mediaType: MediaType;
    sumMineSquared: number;
    sumTheirsSquared: number;
    sumAbsoluteDifference: number;
};


export const createTasteSimilarityRepository = (catalogRegistry: TasteSimilarityCatalogRegistry) => ({
    async findCandidateAggregates(currentUserId: number, mediaTypes: MediaType[]) {
        const sharedRatings = mediaTypes.map((mediaType) => catalogRegistry.get(mediaType).buildSharedRatingsBranch(currentUserId));

        return getDbClient().all<CandidateAggregateRow>(sql`
            WITH shared_ratings AS (
                ${sql.join(sharedRatings, sql` UNION ALL `)}
            )
            SELECT
                COUNT(*) AS count,
                shared.media_type AS mediaType,
                SUM(shared.my_rating) AS sumMine,
                shared.candidate_id AS candidateId,
                SUM(shared.their_rating) AS sumTheirs,
                SUM(shared.my_rating * shared.their_rating) AS sumProduct,
                SUM(shared.my_rating * shared.my_rating) AS sumMineSquared,
                SUM(shared.their_rating * shared.their_rating) AS sumTheirsSquared,
                SUM(ABS(shared.my_rating - shared.their_rating)) AS sumAbsoluteDifference
            FROM shared_ratings AS shared
            INNER JOIN user AS candidate_user ON candidate_user.id = shared.candidate_id
            WHERE candidate_user.email_verified = 1
            GROUP BY shared.candidate_id, shared.media_type
        `);
    },

    async getCandidateProfiles(candidateIds: number[], currentUserId: number) {
        if (candidateIds.length === 0) return [];

        return getDbClient()
            .select({
                id: user.id,
                name: user.name,
                image: user.image,
                privacy: user.privacy,
                totalRatings: sum(userMediaSettings.entriesRated).mapWith(Number),
                followStatus: sql<SocialState | null>`(
                    SELECT ${followers.status}
                    FROM ${followers}
                    WHERE ${followers.followerId} = ${currentUserId} AND ${followers.followedId} = ${user.id}
                    LIMIT 1
                )`,
            })
            .from(user)
            .leftJoin(userMediaSettings, and(eq(userMediaSettings.userId, user.id), eq(userMediaSettings.active, true)))
            .where(inArray(user.id, candidateIds))
            .groupBy(user.id);
    },

    async getSharedFavMedia(currentUserId: number, candidateIds: number[], mediaTypes: MediaType[]) {
        if (candidateIds.length === 0) return [];

        const sharedLovedMedia = mediaTypes.map((mediaType) => (
            catalogRegistry.get(mediaType).buildSharedLovedMediaBranch(currentUserId, candidateIds)
        ));

        return getDbClient().all<SharedLovedMediaRow>(sql`
            WITH shared_loved_media AS (
                ${sql.join(sharedLovedMedia, sql` UNION ALL `)}
            ),
            ranked_by_type AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY candidate_id, media_type
                        ORDER BY both_favorite DESC, lowest_rating DESC, name ASC
                    ) AS media_type_rank
                FROM shared_loved_media
            ),
            ranked_media AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY candidate_id
                        ORDER BY media_type_rank, both_favorite DESC, lowest_rating DESC, name ASC
                    ) AS media_rank
                FROM ranked_by_type
            )
            SELECT
                candidate_id AS candidateId,
                media_id AS mediaId,
                media_type AS mediaType,
                name
            FROM ranked_media
            WHERE media_rank <= 4
            ORDER BY candidate_id, media_rank
        `);
    },
});


export type TasteSimilarityRepository = ReturnType<typeof createTasteSimilarityRepository>;
