import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {ImportMatcherItem} from "@/lib/server/domain/imports/matchers/media-matcher";


export interface InternalNameDateMatch {
    mediaId: number;
    item: ImportMatcherItem;
}


export class InternalNameDateMatcher {
    constructor(private mediaService: BaseService<any, any>) {
    }

    async match(items: ImportMatcherItem[]) {
        const candidates = items.filter(item => item.name?.trim() && isSupportedReleaseDate(item.releaseDate));

        if (candidates.length === 0) {
            return { matched: [], unresolved: items };
        }

        const uniqueNames = [...new Set(candidates.map(item => item.name!.trim().toLowerCase()))];
        const mediaRows = await this.mediaService.findByNames(uniqueNames);
        const mediaByName = new Map<string, typeof mediaRows>();

        for (const media of mediaRows) {
            const trimmedName = media.name.trim().toLowerCase();
            const nameMatches = mediaByName.get(trimmedName) ?? [];
            nameMatches.push(media);
            mediaByName.set(trimmedName, nameMatches);
        }

        const unresolved: ImportMatcherItem[] = [];
        const matched: InternalNameDateMatch[] = [];

        for (const item of items) {
            if (!item.name || !isSupportedReleaseDate(item.releaseDate)) {
                unresolved.push(item);
                continue;
            }

            const dateMatches = (mediaByName.get(item.name.trim().toLowerCase()) ?? [])
                .filter(media => releaseDateMatches(media.releaseDate, item.releaseDate!));

            if (dateMatches.length === 1) {
                matched.push({ item, mediaId: dateMatches[0].id });
            }
            else {
                unresolved.push(item);
            }
        }

        return { matched, unresolved };
    }
}


const isSupportedReleaseDate = (releaseDate: string | null) => {
    return !!releaseDate && /^(\d{4})(-\d{2})?(-\d{2})?$/.test(releaseDate.trim());
};


const releaseDateMatches = (mediaReleaseDate: string | null, importReleaseDate: string) => {
    if (!mediaReleaseDate) return false;
    const expected = importReleaseDate.trim();
    return mediaReleaseDate.trim().slice(0, expected.length) === expected;
};
