import {TasteMatchesSearch} from "@/lib/schemas";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {UserSimilarityRepository} from "@/lib/server/domain/user/user-similarity.repository";
import {calculateTasteSimilarity, emptyRatingAggregate, mergeRatingAggregates, RatingAggregate} from "@/lib/utils/taste-similarity";


const MATCHES_PER_PAGE = 9;
const MINIMUM_SHARED_RATINGS = 5;
const MINIMUM_PER_MEDIA_RATINGS = 3;


export class UserSimilarityService {
    constructor(private repository: typeof UserSimilarityRepository) {
    }

    async getTasteMatches(currentUserId: number, filters: TasteMatchesSearch) {
        const search = filters.search?.toLocaleLowerCase() ?? "";
        const aggregates = await this.repository.findCandidateAggregates(currentUserId, filters.activeTab);
        const candidateAggregates = new Map<number, { overall: RatingAggregate; perMedia: Partial<Record<MediaType, RatingAggregate>> }>();

        for (const row of aggregates) {
            const candidate = candidateAggregates.get(row.candidateId) ?? { overall: emptyRatingAggregate(), perMedia: {} };
            const aggregate = {
                count: row.count,
                sumMine: row.sumMine,
                sumTheirs: row.sumTheirs,
                sumProduct: row.sumProduct,
                sumMineSquared: row.sumMineSquared,
                sumTheirsSquared: row.sumTheirsSquared,
                sumAbsoluteDifference: row.sumAbsoluteDifference,
            };

            candidate.perMedia[row.mediaType] = aggregate;
            mergeRatingAggregates(candidate.overall, aggregate);
            candidateAggregates.set(row.candidateId, candidate);
        }

        const eligibleIds = [...candidateAggregates.entries()]
            .filter(([, stats]) => stats.overall.count >= MINIMUM_SHARED_RATINGS)
            .map(([candidateId]) => candidateId);

        const profiles = await this.repository.getCandidateProfiles(eligibleIds, currentUserId);

        const rankedMatches = profiles
            .filter((profile) => profile.privacy !== PrivacyType.PRIVATE)
            .filter((profile) => !filters.hideFollowed || profile.followStatus !== SocialState.ACCEPTED)
            .filter((profile) => !search || profile.name.toLocaleLowerCase().includes(search))
            .map((profile) => {
                const stats = candidateAggregates.get(profile.id)!;

                return {
                    id: profile.id,
                    name: profile.name,
                    image: profile.image,
                    privacy: profile.privacy,
                    sharedRatings: stats.overall.count,
                    totalRatings: profile.totalRatings ?? 0,
                    similarity: calculateTasteSimilarity(stats.overall),
                    followStatus: profile.followStatus ? { status: profile.followStatus } : null,
                    perMedia: Object.values(MediaType).map((mediaType) => {
                        const aggregate = stats.perMedia[mediaType];
                        if (!aggregate || aggregate.count < MINIMUM_PER_MEDIA_RATINGS) return null;

                        return {
                            mediaType,
                            sharedRatings: aggregate.count,
                            similarity: calculateTasteSimilarity(aggregate),
                        };
                    }).filter((value) => value !== null),
                };
            })
            .sort((left, right) => {
                if (filters.sorting === "overlap") {
                    return right.sharedRatings - left.sharedRatings || right.similarity - left.similarity;
                }
                return right.similarity - left.similarity || right.sharedRatings - left.sharedRatings;
            });

        const isSearching = search.length > 0;
        const featuredMatch = isSearching ? null : rankedMatches[0] ?? null;
        const listedMatches = isSearching ? rankedMatches : rankedMatches.slice(1);

        const pages = Math.max(1, Math.ceil(listedMatches.length / MATCHES_PER_PAGE));
        const page = Math.min(filters.page ?? 1, pages);

        const items = listedMatches.slice((page - 1) * MATCHES_PER_PAGE, page * MATCHES_PER_PAGE);
        const visibleMatches = featuredMatch ? [featuredMatch, ...items] : items;

        const lovedMedia = await this.repository.getSharedFavMedia(currentUserId, visibleMatches.map(({ id }) => id), filters.activeTab);
        const lovedMediaByCandidate = new Map<number, typeof lovedMedia>();

        for (const media of lovedMedia) {
            const candidateMedia = lovedMediaByCandidate.get(media.candidateId) ?? [];
            candidateMedia.push(media);
            lovedMediaByCandidate.set(media.candidateId, candidateMedia);
        }

        const withLovedMedia = <T extends (typeof visibleMatches)[number]>(match: T) => ({
            ...match,
            lovedMedia: lovedMediaByCandidate.get(match.id)?.map(({ candidateId: _, ...media }) => media) ?? [],
        });

        return {
            page,
            pages,
            total: rankedMatches.length,
            items: items.map(withLovedMedia),
            minimumSharedRatings: MINIMUM_SHARED_RATINGS,
            featuredMatch: featuredMatch ? withLovedMedia(featuredMatch) : null,
        };
    }
}
