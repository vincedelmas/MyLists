import {MediaType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";


/** Shared storage mechanism; concrete media edit commands own when and how it is used. */
export class CatalogCoverStorage {
    constructor(private readonly kind: MediaType) {}

    save(value: string | undefined) {
        if (typeof value !== "string" || !value.trim()) return Promise.resolve(undefined);
        return saveImageFromUrl({ imageUrl: value, dirSaveName: `${this.kind}-covers` });
    }
}


export const relationNames = (value: { name: string }[] | undefined) => {
    if (value === undefined) return undefined;
    return value.map(({ name }) => name.trim()).filter(Boolean);
};
