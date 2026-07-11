import {MediaType} from "@/lib/utils/enums";
import {MediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


export class MediaMatcherRegistry {
    private static matchers: Record<MediaType, MediaMatcher> = {} as Record<MediaType, MediaMatcher>;

    static clear() {
        this.matchers = {} as Record<MediaType, MediaMatcher>;
    }

    static register(mediaType: MediaType, matcher: MediaMatcher) {
        if (this.matchers[mediaType]) {
            throw new Error(`Media matcher for ${mediaType} is already registered`);
        }

        this.matchers[mediaType] = matcher;
    }

    static get(mediaType: MediaType) {
        const matcher = this.matchers[mediaType];
        if (!matcher) {
            throw new Error(`Media matcher for ${mediaType} is not registered`);
        }

        return matcher;
    }
}
