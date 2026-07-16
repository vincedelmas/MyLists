import {customType} from "drizzle-orm/sqlite-core";
import {CoverType} from "@/lib/types/media-common.types";
import {getImageFilename, getImageUrl} from "@/lib/utils/image-url";


export const customJson = <TData>(name: string) => customType<{ data: TData; driverData: string }>({
    dataType() {
        return "text";
    },
    toDriver(value: TData) {
        return JSON.stringify(value);
    },
    fromDriver(value: string): TData {
        return JSON.parse(value);
    }
})(name);


export const imageUrl = (name: string, coverType: CoverType) => customType<{ data: string; driverData: string }>({
    dataType() {
        return "text";
    },
    toDriver(value: string) {
        return getImageFilename(value);
    },
    fromDriver(value: string) {
        return getImageUrl(coverType, value);
    },
})(name);


/**
 * Converts better-auth's Date objects (for user `createdAt`/`updatedAt`) to UTC ISO strings in SQLite text format.
 * Handles Date-to-string conversion (replacing 'T' with space, 'Z' with '.000') and string-to-string passthrough.
 */
export const dateAsString = (name: string) => customType<{ data: string; driverData: string }>({
    dataType() {
        return "text";
    },
    toDriver(value: string | Date) {
        if (value instanceof Date) {
            return value.toISOString().replace("T", " ").replace("Z", "000");
        }
        return value;
    },
    fromDriver(value: string) {
        return value;
    },
})(name);
