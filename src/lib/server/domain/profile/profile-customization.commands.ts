import {HighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import {UserProfileRepository} from "@/lib/server/domain/user/user-profile.repository";
import {normalizeHighlightedMediaSettings} from "@/lib/server/domain/profile/profile-customization.settings";


export class ProfileCustomizationCommands {
    constructor(private readonly repository: typeof UserProfileRepository) {}

    async saveHighlightedMediaSettings(userId: number, settings: HighlightedMediaSettings) {
        const normalized = normalizeHighlightedMediaSettings(settings);
        await this.repository.upsertHighlightedMediaSettings(userId, normalized);
        return normalized;
    }
}
