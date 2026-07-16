import {TasteMatchesSearch} from "@/lib/schemas";
import {ProfileReadRepository} from "@/lib/server/domain/profile/profile-read.repository";
import {UserSimilarityService} from "@/lib/server/domain/user/user-similarity.service";
import {UserSimilarityRepository} from "@/lib/server/domain/discovery/user-similarity.repository";


export class TasteMatchesReadService {
    private readonly similarity = new UserSimilarityService(UserSimilarityRepository);

    constructor(private readonly profiles = new ProfileReadRepository()) {}

    async getTasteMatches(userId: number, filters: TasteMatchesSearch) {
        const channels = await this.profiles.getChannels(userId);
        const activeMediaTypes = channels.filter(({ active }) => active).map(({ mediaType }) => mediaType);
        return this.similarity.getTasteMatches(userId, filters, activeMediaTypes);
    }
}
