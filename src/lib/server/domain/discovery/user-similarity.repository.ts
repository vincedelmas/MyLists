import {eq, inArray, sql, sum} from "drizzle-orm";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {followers, libraryStats, user} from "@/lib/server/database/schema";


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


type SharedLovedMediaRow = {
    name: string;
    mediaId: number;
    candidateId: number;
    mediaType: MediaType;
};


export class UserSimilarityRepository {
    static async findCandidateAggregates(currentUserId: number, mediaTypes: MediaType[]) {
        const kinds = sql.join(mediaTypes.map((kind) => sql`${kind}`), sql`, `);
        return getDbClient().all<CandidateAggregateRow>(sql`
            SELECT
                COUNT(*) AS count,
                item.kind AS mediaType,
                SUM(mine.rating) AS sumMine,
                candidate.user_id AS candidateId,
                SUM(candidate.rating) AS sumTheirs,
                SUM(mine.rating * candidate.rating) AS sumProduct,
                SUM(mine.rating * mine.rating) AS sumMineSquared,
                SUM(candidate.rating * candidate.rating) AS sumTheirsSquared,
                SUM(ABS(mine.rating - candidate.rating)) AS sumAbsoluteDifference
            FROM library_entry AS mine
            INNER JOIN library_entry AS candidate
                ON candidate.catalog_item_id = mine.catalog_item_id
                AND candidate.user_id <> mine.user_id
            INNER JOIN catalog_item AS item ON item.id = mine.catalog_item_id
            INNER JOIN user AS candidate_user ON candidate_user.id = candidate.user_id
            WHERE mine.user_id = ${currentUserId}
                AND mine.rating IS NOT NULL
                AND candidate.rating IS NOT NULL
                AND item.kind IN (${kinds})
                AND candidate_user.email_verified = 1
                AND candidate_user.privacy <> ${PrivacyType.PRIVATE}
                AND candidate_user.name <> 'DemoProfile'
            GROUP BY candidate.user_id, item.kind
        `);
    }

    static async getCandidateProfiles(candidateIds: number[], currentUserId: number) {
        if (candidateIds.length === 0) return [];
        return getDbClient().select({
            id: user.id,
            name: user.name,
            image: user.image,
            privacy: user.privacy,
            totalRatings: sum(libraryStats.entriesRated).mapWith(Number),
            followStatus: sql<SocialState | null>`(
                SELECT ${followers.status}
                FROM ${followers}
                WHERE ${followers.followerId} = ${currentUserId} AND ${followers.followedId} = ${user.id}
                LIMIT 1
            )`,
        }).from(user)
            .leftJoin(libraryStats, eq(libraryStats.userId, user.id))
            .where(inArray(user.id, candidateIds))
            .groupBy(user.id);
    }

    static async getSharedFavMedia(currentUserId: number, candidateIds: number[], mediaTypes: MediaType[]) {
        if (candidateIds.length === 0) return [];
        const ids = sql.join(candidateIds.map((id) => sql`${id}`), sql`, `);
        const kinds = sql.join(mediaTypes.map((kind) => sql`${kind}`), sql`, `);
        return getDbClient().all<SharedLovedMediaRow>(sql`
            WITH shared_loved_media AS (
                SELECT
                    candidate.user_id AS candidate_id,
                    item.id AS media_id,
                    item.kind AS media_type,
                    item.name AS name,
                    CASE WHEN mine.favorite = 1 AND candidate.favorite = 1 THEN 1 ELSE 0 END AS both_favorite,
                    MIN(mine.rating, candidate.rating) AS lowest_rating
                FROM library_entry AS mine
                INNER JOIN library_entry AS candidate
                    ON candidate.catalog_item_id = mine.catalog_item_id
                    AND candidate.user_id IN (${ids})
                INNER JOIN catalog_item AS item ON item.id = mine.catalog_item_id
                WHERE mine.user_id = ${currentUserId}
                    AND mine.rating >= 8
                    AND candidate.rating >= 8
                    AND item.kind IN (${kinds})
            ),
            ranked_by_type AS (
                SELECT *, ROW_NUMBER() OVER (
                    PARTITION BY candidate_id, media_type
                    ORDER BY both_favorite DESC, lowest_rating DESC, name ASC, media_id ASC
                ) AS media_type_rank
                FROM shared_loved_media
            ),
            ranked_media AS (
                SELECT *, ROW_NUMBER() OVER (
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
