import {and, asc, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryTag} from "@/lib/server/database/schema";


/** Reusable tag query bound by a concrete media module. */
export class LibraryTagsQuery {
    constructor(private readonly kind: MediaType) {}

    getNames(userId: number) {
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, this.kind)))
            .orderBy(asc(libraryTag.name));
    }
}
