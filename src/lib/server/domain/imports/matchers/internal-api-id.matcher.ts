import {ApiProviderType} from "@/lib/utils/enums";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {ImportMatcherItem} from "@/lib/server/domain/imports/matchers/media-matcher";


export interface InternalApiIdMatch {
    mediaId: number;
    item: ImportMatcherItem;
}


export class InternalApiIdMatcher {
    constructor(
        private expectedProvider: ApiProviderType,
        private mediaService: BaseService<any, any>,
    ) {
    }

    async match(items: ImportMatcherItem[]) {
        const candidates = items.filter((item) => item.externalApiSource === this.expectedProvider && item.externalApiId);

        if (candidates.length === 0) {
            return { matched: [], unresolved: items };
        }

        const uniqueApiIds = [...new Set(candidates.map((i) => i.externalApiId!))];
        const mediaRows = await this.mediaService.findByApiIds(uniqueApiIds);
        const mediaIdByApiId = new Map(mediaRows.map((media) => [media.apiId, media.id]));

        const matched: InternalApiIdMatch[] = [];
        const unresolved: ImportMatcherItem[] = [];

        for (const item of items) {
            const mediaId = item.externalApiId ? mediaIdByApiId.get(item.externalApiId) : undefined;

            if (mediaId) matched.push({ item, mediaId });
            else unresolved.push(item);
        }

        return { matched, unresolved };
    }
}
