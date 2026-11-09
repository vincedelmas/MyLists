import {ApiProviderType} from "@/lib/utils/enums";
import type {MediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";
import type {InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";


export const internalApiIdMatcher = (apiProviderType: ApiProviderType, mediaService: Pick<MediaQueries, "findByApiIds">): InternalMediaMatcher => ({
    async match(items: ImportItemsSelect[]) {
        const candidates = items.filter((item) => item.externalApiSource === apiProviderType && item.externalApiId);

        if (candidates.length === 0) {
            return { matched: [], unresolved: items };
        }

        const uniqueApiIds = [...new Set(candidates.map((i) => i.externalApiId!))];
        const mediaRows = await mediaService.findByApiIds(uniqueApiIds);
        const mediaIdByApiId = new Map(mediaRows.map((media) => [String(media.apiId), media.id]));

        const matched: MatchedImportItem[] = [];
        const unresolved: ImportItemsSelect[] = [];

        for (const item of items) {
            const mediaId = item.externalApiSource === apiProviderType && item.externalApiId
                ? mediaIdByApiId.get(item.externalApiId)
                : undefined;

            if (mediaId) matched.push({ item, mediaId });
            else unresolved.push(item);
        }

        return { matched, unresolved };
    }
});


export const internalNameDateMatcher = (mediaService: Pick<MediaQueries, "findByNames">, apiProviderType?: ApiProviderType): InternalMediaMatcher => ({
    async match(items: ImportItemsSelect[]) {
        const canMatchByName = (item: ImportItemsSelect) => item.name?.trim()
            && isSupportedReleaseDate(item.releaseDate)
            && !item.payload.imdbId
            && !(apiProviderType && item.externalApiSource === apiProviderType && item.externalApiId);

        const candidates = items.filter(canMatchByName);

        if (candidates.length === 0) {
            return { matched: [], unresolved: items };
        }

        const uniqueNames = [...new Set(candidates.map(item => item.name!.trim().toLowerCase()))];
        const mediaRows = await mediaService.findByNames(uniqueNames);
        const mediaByName = new Map<string, typeof mediaRows>();

        for (const media of mediaRows) {
            const trimmedName = media.name.trim().toLowerCase();
            const nameMatches = mediaByName.get(trimmedName) ?? [];
            nameMatches.push(media);
            mediaByName.set(trimmedName, nameMatches);
        }

        const matched: MatchedImportItem[] = [];
        const unresolved: ImportItemsSelect[] = [];

        for (const item of items) {
            if (!canMatchByName(item)) {
                unresolved.push(item);
                continue;
            }

            const dateMatches = (mediaByName.get(item.name!.trim().toLowerCase()) ?? [])
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
});


const isSupportedReleaseDate = (releaseDate: string | null) => {
    return !!releaseDate && /^(\d{4})(-\d{2})?(-\d{2})?$/.test(releaseDate.trim());
};


const releaseDateMatches = (mediaReleaseDate: string | null, importReleaseDate: string) => {
    if (!mediaReleaseDate) return false;
    const expected = importReleaseDate.trim();
    return mediaReleaseDate.trim().slice(0, expected.length) === expected;
};
