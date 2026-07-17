import {eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryStats} from "@/lib/server/database/schema";
import {LibraryStatsAggregate} from "@/lib/server/domain/media/shared/library/library-stats-rebuild.types";


export class LibraryStatsRebuildRepository {
    async replace(kind: MediaType, aggregates: LibraryStatsAggregate[]) {
        await getDbClient().delete(libraryStats).where(eq(libraryStats.kind, kind));
        if (aggregates.length === 0) return;

        await getDbClient().insert(libraryStats).values(aggregates.map((aggregate) => ({
            ...aggregate,
            kind,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })));
    }
}
