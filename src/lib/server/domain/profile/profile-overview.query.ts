import {user} from "@/lib/server/database/schema";
import {UserStatsService} from "@/lib/server/domain/user/user-stats.service";
import {ProfileHighlightsQuery} from "@/lib/server/domain/profile/profile-highlights.query";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {LibraryAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {AchievementsQuery} from "@/lib/server/domain/achievements/achievements.query";
import {ProfileReadRepository} from "@/lib/server/domain/profile/profile-read.repository";
import {SocialGraphQuery} from "@/lib/server/domain/social/social-graph.query";


export type ProfileIdentity = Pick<typeof user.$inferSelect, "id" | "name" | "image" | "privacy" | "createdAt" | "ratingSystem" | "backgroundImage">;


/** Audience-aware composition for the profile overview and public shell. */
export class ProfileOverviewQuery {
    constructor(
        private readonly stats: UserStatsService,
        private readonly highlights: ProfileHighlightsQuery,
        private readonly updates: ProfileUpdatesQuery,
        private readonly achievements: AchievementsQuery,
        private readonly social: SocialGraphQuery,
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
            this.highlights.resolveHighlightedMedia(target.id),
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
