import {ApiProviderType} from "@/lib/utils/enums";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {ImportMatcherItem} from "@/lib/server/domain/imports/matchers/media-matcher";
import {InternalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {InternalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";


export class InternalMediaMatcher {
    private apiIdMatcher: InternalApiIdMatcher;
    private nameDateMatcher: InternalNameDateMatcher;

    constructor(expectedProvider: ApiProviderType, mediaService: BaseService<any, any>) {
        this.nameDateMatcher = new InternalNameDateMatcher(mediaService);
        this.apiIdMatcher = new InternalApiIdMatcher(expectedProvider, mediaService);
    }

    async match(items: ImportMatcherItem[]) {
        const apiIdResult = await this.apiIdMatcher.match(items);
        const nameDateResult = await this.nameDateMatcher.match(apiIdResult.unresolved);

        return {
            matched: [...apiIdResult.matched, ...nameDateResult.matched],
            unresolved: nameDateResult.unresolved,
        };
    }
}
