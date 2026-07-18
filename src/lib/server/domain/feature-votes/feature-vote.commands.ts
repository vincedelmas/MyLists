import {FormattedError} from "@/lib/utils/error-classes";
import {FeatureStatus, SocialNotifType} from "@/lib/utils/enums";
import {NotificationService} from "@/lib/server/domain/notifications/notification.service";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";


/** Feature request, vote, moderation, and notification workflows. */
export class FeatureVoteCommands {
    constructor(
        private readonly repository: typeof FeatureVotesRepository,
        private readonly notifications: typeof NotificationService,
    ) {
    }

    async createFeatureRequest(userId: number, params: { title: string; description?: string | null }) {
        const { duplicate, featureId } = await this.repository.createFeatureRequest({
            createdBy: userId,
            title: params.title,
            status: FeatureStatus.UNDER_CONSIDERATION,
            description: params.description || "No description provided.",
        });

        if (duplicate) {
            throw new FormattedError("That feature request already exists. Please vote for it instead.");
        }

        const admins = await this.repository.getAdminUserIds();
        await Promise.all(admins
            .filter((admin) => admin.id !== userId)
            .map((admin) => this.notifications.createSocialNotification({
                actorId: userId,
                userId: admin.id,
                featureRequestId: featureId,
                type: SocialNotifType.FEATURE_REQUEST_CREATED,
            })),
        );
    }

    async toggleFeatureVote(featureId: number, userId: number) {
        const { feature, existingVote } = await this.repository.findFeatureWithUserVote(featureId, userId);
        if (!feature) throw new FormattedError("Feature not found.");

        if (feature.status === FeatureStatus.REJECTED || feature.status === FeatureStatus.COMPLETED) {
            throw new FormattedError("Voting is closed for this feature.");
        }

        if (existingVote) return this.repository.deleteVoteById(existingVote.id);
        await this.repository.insertVote({ featureId, userId });
    }

    async updateFeatureStatus(
        params: { featureId: number; status: FeatureStatus; adminComment?: string | null },
        adminUserId: number,
    ) {
        const feature = await this.repository.getFeatureRequest(params.featureId);
        if (!feature) throw new FormattedError("Feature not found.");

        const nextAdminComment = params.adminComment || null;
        const statusChanged = feature.status !== params.status;
        const adminCommentChanged = (feature.adminComment ?? null) !== nextAdminComment && !!nextAdminComment;

        await this.repository.updateFeatureStatus(params.featureId, params.status, nextAdminComment);

        if (feature.createdBy && feature.createdBy !== adminUserId && (statusChanged || adminCommentChanged)) {
            await this.notifications.createSocialNotification({
                actorId: adminUserId,
                userId: feature.createdBy,
                featureRequestId: params.featureId,
                type: SocialNotifType.FEATURE_REQUEST_UPDATED,
            });
        }
    }

    deleteFeatureRequest(featureId: number) {
        return this.repository.deleteFeatureRequest(featureId);
    }
}
