import {and, asc, eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryStats, profileMediaChannel} from "@/lib/server/database/schema";

export class ProfileReadRepository {
    getChannels(userId: number) {
        return getDbClient().select({
            mediaType: profileMediaChannel.kind,
            active: profileMediaChannel.enabled,
            // Drizzle's current relational user query passes numbers through a
            // SQLite JSON row. Preserve that 15-digit representation exactly.
            timeSpent: sql<number>`coalesce(json_extract(json_array(${libraryStats.timeSpentMinutes}), '$[0]'), 0)`.mapWith(Number),
        }).from(profileMediaChannel)
            .leftJoin(libraryStats, and(
                eq(libraryStats.userId, profileMediaChannel.userId),
                eq(libraryStats.kind, profileMediaChannel.kind),
            ))
            .where(eq(profileMediaChannel.userId, userId))
            // The current relational profile query returns channels by kind.
            // Header payloads omit the kind, so this order is part of the API contract.
            .orderBy(asc(profileMediaChannel.kind));
    }
}
