import {HighlightedMediaTab} from "@/lib/types/profile-custom.types";
import {UserProfileRepository} from "@/lib/server/domain/user/user-profile.repository";
import {ProfileHighlightsQuery} from "@/lib/server/domain/profile/profile-highlights.query";
import {normalizeHighlightedMediaSettings} from "@/lib/server/domain/profile/profile-customization.settings";


export class ProfileCustomizationQuery {
    constructor(
        private readonly repository: typeof UserProfileRepository,
        private readonly highlights = new ProfileHighlightsQuery(),
    ) {}

    async getHighlightedMediaSettings(userId: number) {
        return normalizeHighlightedMediaSettings(await this.repository.getHighlightedMediaSettings(userId));
    }

    resolveHighlightedMedia(userId: number) {
        return this.highlights.resolveHighlightedMedia(userId);
    }

    searchHighlightedMedia(userId: number, tab: HighlightedMediaTab, query: string) {
        return this.highlights.searchHighlightedMedia(userId, tab, query);
    }
}
