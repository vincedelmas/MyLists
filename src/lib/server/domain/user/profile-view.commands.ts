import {MediaType} from "@/lib/utils/enums";
import {UserRepository} from "@/lib/server/domain/user/user.repository";
import {ProfileChannelAccessRepository} from "@/lib/server/domain/access/profile-channel-access.repository";


export class ProfileViewCommands {
    constructor(
        private readonly profileChannels = new ProfileChannelAccessRepository(),
        private readonly repository = UserRepository,
    ) {}

    recordProfileView(userId: number) {
        return this.repository.incrementProfileView(userId);
    }

    recordMediaChannelView(userId: number, mediaType: MediaType) {
        return this.profileChannels.incrementView(userId, mediaType);
    }
}
