import {ApiProviderType} from "@/lib/utils/enums";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";
import {InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


export const internalApiIdMatcher = (apiProviderType: ApiProviderType, mediaService: BaseService<any, any>) => ({
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
}) satisfies InternalMediaMatcher;
