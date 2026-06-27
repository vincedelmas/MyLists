import {eq, inArray, sql, sum} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {followers, user, userMediaSettings} from "@/lib/server/database/schema";


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


export class UserSimilarityRepository {
    static async findCandidateAggregates(currentUserId: number, mediaTypes: MediaType[]) {
        const sharedRatings = mediaTypes.map((mediaType) => this._sharedRatingsBranch(mediaType, currentUserId));

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
                AND candidate_user.privacy <> ${PrivacyType.PRIVATE}
                AND candidate_user.name <> 'DemoProfile'
            GROUP BY shared.candidate_id, shared.media_type
        `);
    }

    static async getCandidateProfiles(candidateIds: number[], currentUserId: number) {
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
            .leftJoin(userMediaSettings, eq(userMediaSettings.userId, user.id))
            .where(inArray(user.id, candidateIds))
            .groupBy(user.id);
    }

    static async getSharedFavMedia(currentUserId: number, candidateIds: number[], mediaTypes: MediaType[]) {
        if (candidateIds.length === 0) return [];

        const sharedLovedMedia = mediaTypes.map((mediaType) => this._sharedLovedMediaBranch(mediaType, currentUserId, candidateIds));

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
    }

    static _sharedRatingsBranch(mediaType: MediaType, currentUserId: number) {
        const listTable = sql.raw(`${mediaType}_list`);

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
            WHERE mine.user_id = ${currentUserId}
                AND mine.rating IS NOT NULL
                AND candidate.rating IS NOT NULL
        `;
    };

    static _sharedLovedMediaBranch(mediaType: MediaType, currentUserId: number, candidateIds: number[]) {
        const mediaTable = sql.raw(mediaType);
        const listTable = sql.raw(`${mediaType}_list`);
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
            INNER JOIN ${mediaTable} AS media ON media.id = mine.media_id
            WHERE mine.user_id = ${currentUserId}
                AND mine.rating >= 8
                AND candidate.rating >= 8
        `;
    }
}
