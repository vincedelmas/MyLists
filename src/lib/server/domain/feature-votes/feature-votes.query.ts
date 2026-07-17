import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";


/** Read model for the public feature-vote board. */
export class FeatureVotesQuery {
    constructor(private readonly repository: typeof FeatureVotesRepository) {}

    async getFeatureVotes(userId?: number) {
        const { features, voteAgg, userVotes } = await this.repository.getFeatureVotesData(userId);
        const votesByFeature = new Map(voteAgg.map((vote) => [vote.featureId, Number(vote.totalVotes ?? 0)]));
        const userVoteIds = new Set(userVotes.map((vote) => vote.featureId));

        return {
            items: features.map((feature) => ({
                totalVotes: votesByFeature.get(feature.id) ?? 0,
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
            })),
        };
    }
}
