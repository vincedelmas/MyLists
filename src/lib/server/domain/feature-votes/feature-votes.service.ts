import {FormattedError} from "@/lib/utils/error-classes";
import {FeatureStatus, SocialNotifType} from "@/lib/utils/enums";
import type {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import type {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";


export const createFeatureVotesService = (repository: FeatureVotesRepository, notificationsService: NotificationsService) => ({
    async getFeatureVotes(userId?: number) {
        const { features, voteAgg, userVotes } = await repository.getFeatureVotesData(userId);

        const votesByFeature = new Map<number, number>();
        const userVoteIds = new Set(userVotes.map((vote) => vote.featureId));
        voteAgg.forEach((vote) => votesByFeature.set(vote.featureId, Number(vote.totalVotes ?? 0)));

        const items = features.map((feature) => {
            const totalVotes = votesByFeature.get(feature.id) ?? 0;

            return {
                totalVotes,
                id: feature.id,
                title: feature.title,
                status: feature.status,
                createdAt: feature.createdAt,
                description: feature.description,
                adminComment: feature.adminComment,
                hasUserVote: userVoteIds.has(feature.id),
                author: feature.author ? {
                    id: feature.author.id,
                    name: feature.author.name,
                    image: feature.author.image,
                } : null,
            };
        });

        return { items };
    },

    async createFeatureRequest(userId: number, params: { title: string; description?: string | null }) {
        const { duplicate, featureId } = await repository.createFeatureRequest({
            createdBy: userId,
            title: params.title,
            status: FeatureStatus.UNDER_CONSIDERATION,
            description: params.description || "No description provided.",
        });

        if (duplicate) {
            throw new FormattedError("That feature request already exists. Please vote for it instead.");
        }

        const admins = await repository.getAdminUserIds();
        await Promise.all(admins
            .filter((admin) => admin.id !== userId)
            .map((admin) => notificationsService.createSocialNotification({
                actorId: userId,
                userId: admin.id,
                featureRequestId: featureId,
                type: SocialNotifType.FEATURE_REQUEST_CREATED,
            }))
        );
    },

    async toggleFeatureVote(featureId: number, userId: number) {
        const { feature, existingVote } = await repository.findFeatureWithUserVote(featureId, userId);
        if (!feature) throw new FormattedError("Feature not found.");

        const isLocked = feature.status === FeatureStatus.REJECTED || feature.status === FeatureStatus.COMPLETED;
        if (isLocked) throw new FormattedError("Voting is closed for this feature.");

        if (existingVote) {
            return repository.deleteVoteById(existingVote.id);
        }

        await repository.insertVote({ featureId, userId });
    },

    async updateFeatureStatus(params: { featureId: number; status: FeatureStatus; adminComment?: string | null }, adminUserId: number) {
        const feature = await repository.getFeatureRequest(params.featureId);
        if (!feature) throw new FormattedError("Feature not found.");

        const nextAdminComment = params.adminComment || null;
        const statusChanged = feature.status !== params.status;
        const adminCommentChanged = (feature.adminComment ?? null) !== nextAdminComment && !!nextAdminComment;

        await repository.updateFeatureStatus(params.featureId, params.status, nextAdminComment);

        if (feature.createdBy && feature.createdBy !== adminUserId && (statusChanged || adminCommentChanged)) {
            await notificationsService.createSocialNotification({
                actorId: adminUserId,
                userId: feature.createdBy,
                featureRequestId: params.featureId,
                type: SocialNotifType.FEATURE_REQUEST_UPDATED,
            });
        }
    },

    async deleteFeatureRequest(featureId: number) {
        await repository.deleteFeatureRequest(featureId);
    },
});
