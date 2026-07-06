import {MediaType} from "@/lib/utils/enums";
import {MediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher";


export class MediaMatcherRegistry {
    private matchers: Partial<Record<MediaType, MediaMatcher>> = {};

    register(mediaType: MediaType, matcher: MediaMatcher) {
        if (this.matchers[mediaType]) {
            throw new Error(`Media matcher for ${mediaType} is already registered`);
        }

        this.matchers[mediaType] = matcher;
    }

    get(mediaType: MediaType) {
        const matcher = this.matchers[mediaType];
        if (!matcher) {
            throw new Error(`Media matcher for ${mediaType} is not registered`);
        }

        return matcher;
    }
}
