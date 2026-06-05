import {FeatureStatus, RoleType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, count, desc, eq, getTableColumns, sql} from "drizzle-orm";
import {featureRequests, featureVotes, user} from "@/lib/server/database/schema";


export class FeatureVotesRepository {
    static async getFeatureVotesData(userId?: number) {
        const db = getDbClient();

        const [features, voteAgg] = await Promise.all([
            db.select({
                author: {
                    id: user.id,
                    name: user.name,
                    image: user.image,
                },
                ...getTableColumns(featureRequests),
            })
                .from(featureRequests)
                .leftJoin(user, eq(featureRequests.createdBy, user.id))
                .orderBy(desc(featureRequests.createdAt)),
            db.select({
                totalVotes: count(),
                featureId: featureVotes.featureId,
            })
                .from(featureVotes)
                .groupBy(featureVotes.featureId),
        ]);

        let userVotes: { featureId: number }[] = [];
        if (userId) {
            userVotes = await db
                .select({ featureId: featureVotes.featureId })
                .from(featureVotes)
                .where(eq(featureVotes.userId, userId));
        }

        return { features, voteAgg, userVotes };
    }

    static async findFeatureWithUserVote(featureId: number, userId: number) {
        const tx = getDbClient();

        const [feature, existingVote] = await Promise.all([
            tx
                .select()
                .from(featureRequests)
                .where(eq(featureRequests.id, featureId))
                .get(),
            tx
                .select()
                .from(featureVotes)
                .where(and(eq(featureVotes.userId, userId), eq(featureVotes.featureId, featureId)))
                .get(),
        ]);

        return { feature, existingVote };
    }

    static async createFeatureRequest(values: typeof featureRequests.$inferInsert) {
        const existing = getDbClient()
            .select({ id: featureRequests.id })
            .from(featureRequests)
            .where(sql`lower(${featureRequests.title}) = ${values.title!.toLowerCase()}`)
            .get();

        if (existing) {
            return { duplicate: true as const };
        }

        const [feature] = await getDbClient()
            .insert(featureRequests)
            .values(values)
            .returning({ id: featureRequests.id });

        return { duplicate: false as const, featureId: feature.id };
    }

    static async getAdminUserIds() {
        return getDbClient()
            .select({ id: user.id })
            .from(user)
            .where(eq(user.role, RoleType.ADMIN));
    }

    static async getFeatureRequest(featureId: number) {
        return getDbClient()
            .select()
            .from(featureRequests)
            .where(eq(featureRequests.id, featureId))
            .get();
    }

    static async deleteVoteById(voteId: number) {
        await getDbClient()
            .delete(featureVotes)
            .where(eq(featureVotes.id, voteId));
    }

    static async insertVote(values: typeof featureVotes.$inferInsert) {
        await getDbClient().insert(featureVotes).values(values);
    }

    static async updateFeatureStatus(featureId: number, status: FeatureStatus, adminComment?: string | null) {
        await getDbClient()
            .update(featureRequests)
            .set({ status, adminComment })
            .where(eq(featureRequests.id, featureId));
    }

    static async deleteFeatureRequest(featureId: number) {
        await getDbClient()
            .delete(featureRequests)
            .where(eq(featureRequests.id, featureId));
    }
}
