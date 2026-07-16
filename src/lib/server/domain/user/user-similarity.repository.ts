import {inArray, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {
    catalogItem,
    followers,
    libraryEntry,
    libraryStats,
    profileMediaChannel,
    user,
} from "@/lib/server/database/schema";


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
        if (mediaTypes.length === 0) return [];
        const kinds = sql.join(mediaTypes.map((kind) => sql`${kind}`), sql`, `);

        return getDbClient().all<CandidateAggregateRow>(sql`
            WITH shared_ratings AS (
                SELECT
                    candidate.user_id AS candidate_id,
                    media.kind AS media_type,
                    mine.rating AS my_rating,
                    candidate.rating AS their_rating
                FROM ${libraryEntry} AS mine
                INNER JOIN ${libraryEntry} AS candidate
                    ON candidate.catalog_item_id = mine.catalog_item_id
                    AND candidate.user_id <> mine.user_id
                INNER JOIN ${catalogItem} AS media ON media.id = mine.catalog_item_id
                INNER JOIN ${profileMediaChannel} AS mine_channel
                    ON mine_channel.user_id = mine.user_id
                    AND mine_channel.kind = media.kind
                    AND mine_channel.enabled = 1
                INNER JOIN ${profileMediaChannel} AS candidate_channel
                    ON candidate_channel.user_id = candidate.user_id
                    AND candidate_channel.kind = media.kind
                    AND candidate_channel.enabled = 1
                WHERE mine.user_id = ${currentUserId}
                    AND media.kind IN (${kinds})
                    AND mine.rating IS NOT NULL
                    AND candidate.rating IS NOT NULL
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
            INNER JOIN ${user} AS candidate_user ON candidate_user.id = shared.candidate_id
            WHERE candidate_user.email_verified = 1
                AND candidate_user.name <> 'DemoProfile'
                AND (
                    candidate_user.privacy IN (${PrivacyType.PUBLIC}, ${PrivacyType.RESTRICTED})
                    OR (
                        candidate_user.privacy = ${PrivacyType.PRIVATE}
                        AND EXISTS (
                            SELECT 1 FROM ${followers} AS access_follow
                            WHERE access_follow.follower_id = ${currentUserId}
                                AND access_follow.followed_id = candidate_user.id
                                AND access_follow.status = ${SocialState.ACCEPTED}
                        )
                    )
                )
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
                totalRatings: sql<number>`COALESCE((
                    SELECT SUM(${libraryStats.entriesRated})
                    FROM ${libraryStats}
                    INNER JOIN ${profileMediaChannel}
                        ON ${profileMediaChannel.userId} = ${libraryStats.userId}
                        AND ${profileMediaChannel.kind} = ${libraryStats.kind}
                        AND ${profileMediaChannel.enabled} = 1
                    WHERE ${libraryStats.userId} = ${user.id}
                ), 0)`.mapWith(Number),
                followStatus: sql<SocialState | null>`(
                    SELECT ${followers.status}
                    FROM ${followers}
                    WHERE ${followers.followerId} = ${currentUserId} AND ${followers.followedId} = ${user.id}
                    LIMIT 1
                )`,
            })
            .from(user)
            .where(inArray(user.id, candidateIds));
    }

    static async getSharedFavMedia(currentUserId: number, candidateIds: number[], mediaTypes: MediaType[]) {
        if (candidateIds.length === 0 || mediaTypes.length === 0) return [];
        const ids = sql.join(candidateIds.map((id) => sql`${id}`), sql`, `);
        const kinds = sql.join(mediaTypes.map((kind) => sql`${kind}`), sql`, `);

        return getDbClient().all<SharedLovedMediaRow>(sql`
            WITH shared_loved_media AS (
                SELECT
                    candidate.user_id AS candidate_id,
                    media.id AS media_id,
                    media.kind AS media_type,
                    media.name AS name,
                    CASE WHEN mine.favorite = 1 AND candidate.favorite = 1 THEN 1 ELSE 0 END AS both_favorite,
                    MIN(mine.rating, candidate.rating) AS lowest_rating
                FROM ${libraryEntry} AS mine
                INNER JOIN ${libraryEntry} AS candidate
                    ON candidate.catalog_item_id = mine.catalog_item_id
                    AND candidate.user_id IN (${ids})
                INNER JOIN ${catalogItem} AS media ON media.id = mine.catalog_item_id
                INNER JOIN ${profileMediaChannel} AS mine_channel
                    ON mine_channel.user_id = mine.user_id
                    AND mine_channel.kind = media.kind
                    AND mine_channel.enabled = 1
                INNER JOIN ${profileMediaChannel} AS candidate_channel
                    ON candidate_channel.user_id = candidate.user_id
                    AND candidate_channel.kind = media.kind
                    AND candidate_channel.enabled = 1
                WHERE mine.user_id = ${currentUserId}
                    AND media.kind IN (${kinds})
                    AND mine.rating >= 8
                    AND candidate.rating >= 8
            ),
            ranked_by_type AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY candidate_id, media_type
                        ORDER BY both_favorite DESC, lowest_rating DESC, name ASC, media_id ASC
                    ) AS media_type_rank
                FROM shared_loved_media
            ),
            ranked_media AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY candidate_id
                        ORDER BY media_type_rank, both_favorite DESC, lowest_rating DESC, name ASC, media_id ASC
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
}
