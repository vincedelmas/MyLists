import {and, asc, eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryStats, profileMediaChannel} from "@/lib/server/database/schema";


export class ProfileReadRepository {
    getChannels(userId: number) {
        return getDbClient()
            .select({
                mediaType: profileMediaChannel.kind,
                active: profileMediaChannel.enabled,
                timeSpent: sql<number>`${libraryStats.timeSpentMinutes}`,
            }).from(profileMediaChannel)
            .leftJoin(libraryStats, and(
                eq(libraryStats.userId, profileMediaChannel.userId),
                eq(libraryStats.kind, profileMediaChannel.kind),
            )).where(eq(profileMediaChannel.userId, userId))
            .orderBy(asc(profileMediaChannel.kind));
    }
}
