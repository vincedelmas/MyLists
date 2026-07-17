import {and, eq, isNotNull, lte, ne, SQL, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {catalogItem} from "@/lib/server/database/schema";


/** Common structural requirements reused by media-owned WCF eligibility policies. */
export const wcfEligibility = (kind: MediaType, popularity: SQL) => and(
    eq(catalogItem.kind, kind),
    popularity,
    isNotNull(catalogItem.releaseDate),
    ne(catalogItem.imageCover, "default.jpg"),
    ne(catalogItem.releaseDate, ""),
    lte(catalogItem.releaseDate, sql`date('now')`),
);
