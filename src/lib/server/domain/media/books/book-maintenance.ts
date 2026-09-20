import {sql} from "drizzle-orm";
import {bookEditions, books, bookWorkAudit, bookWorkCandidates} from "@/lib/server/database/schema/media/books.schema";

export const bookMaintenancePolicy = {
    additionalCoverReferences: sql`
        SELECT image_cover AS imageCover FROM ${bookEditions}
        UNION SELECT value AS imageCover FROM ${bookWorkAudit}, json_tree(${bookWorkAudit.snapshot})
        WHERE key IN ('imageCover', 'customCover') AND type = 'text'
    `,
    retainOrphan: sql`
        EXISTS (SELECT 1 FROM ${bookWorkAudit} WHERE ${bookWorkAudit.sourceWorkId} = ${books.id} OR ${bookWorkAudit.targetWorkId} = ${books.id})
        OR EXISTS (SELECT 1 FROM ${bookWorkCandidates} WHERE ${bookWorkCandidates.firstWorkId} = ${books.id} OR ${bookWorkCandidates.secondWorkId} = ${books.id})
        OR (SELECT count(*) FROM ${bookEditions} WHERE ${bookEditions.mediaId} = ${books.id}) > 1
    `,
};
