import {user} from "@/lib/server/database/schema";
import {UserStatsService} from "@/lib/server/domain/user/user-stats.service";
import {UserProfileService} from "@/lib/server/domain/user/user-profile.service";
import {UserUpdatesService} from "@/lib/server/domain/user/user-updates.service";
import {LibraryAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {AchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {ProfileReadRepository} from "@/lib/server/domain/profile/profile-read.repository";
import {SocialGraphReadService} from "@/lib/server/domain/social/social-graph-read.service";


export type ProfileIdentity = Pick<typeof user.$inferSelect, "id" | "name" | "image" | "privacy" | "createdAt" | "ratingSystem" | "backgroundImage">;


export class ProfileReadService {
    constructor(
        private readonly stats: UserStatsService,
        private readonly customization: UserProfileService,
        private readonly updates: UserUpdatesService,
        private readonly achievements: AchievementsService,
        private readonly social: SocialGraphReadService,
        private readonly repository = new ProfileReadRepository(),
    ) {
    }

    async getPublicHeader(target: ProfileIdentity, viewerId?: number) {
        const [channels, social] = await Promise.all([
            this.repository.getChannels(target.id),
            this.social.getPublicHeader(target.id, viewerId),
        ]);

        return {
            userData: {
                id: target.id,
                name: target.name,
                image: target.image,
                privacy: target.privacy,
                createdAt: target.createdAt,
                backgroundImage: target.backgroundImage,
                userMediaSettings: channels.map(({ timeSpent, active }) => ({ timeSpent, active })),
            },
            social: {
                followId: target.id,
                followsCount: social.followsCount,
                followStatus: social.followStatus,
                followersCount: social.followersCount,
            },
        };
    }

    async getOverview(target: ProfileIdentity, viewerId: number | undefined, access: LibraryAccessScope) {
        this.assertOwnerScope(access, target.id);
        
        const [
            channels,
            social,
            userFollows,
            userUpdates,
            followsUpdates,
            mediaGlobalSummary,
            perMediaSummary,
            highlightedMedia,
            achievements,
        ] = await Promise.all([
            this.repository.getChannels(target.id),
            this.social.getPublicHeader(target.id, viewerId),
            this.social.getFollows(access, target.id, undefined),
            this.updates.getUserUpdates(target.id),
            this.updates.getFollowsUpdates(target.id, viewerId),
            this.stats.userPreComputedStatsSummary(target.id),
            this.stats.userPerMediaSummaryStats(target.id),
            this.customization.resolveHighlightedMedia(target.id),
            this.achievements.getAchievementsDetails(target.id),
        ]);

        return {
            userUpdates,
            userFollows,
            achievements,
            followsUpdates,
            perMediaSummary,
            highlightedMedia,
            mediaGlobalSummary,
            followsCount: social.followsCount,
            userData: {
                id: target.id,
                name: target.name,
                image: target.image,
                privacy: target.privacy,
                createdAt: target.createdAt,
                ratingSystem: target.ratingSystem,
                backgroundImage: target.backgroundImage,
                userMediaSettings: channels,
            },
        };
    }

    private assertOwnerScope(access: LibraryAccessScope, ownerId: number) {
        if (access.ownerId !== ownerId) {
            throw new Error(`Library access scope for user ${access.ownerId} cannot read profile ${ownerId}.`);
        }
    }
}
