import {describe, expect, it, vi} from "vitest";
import {MediaType, PrivacyType, SocialState} from "@/lib/utils/enums";
import {UserSimilarityService} from "@/lib/server/domain/user/user-similarity.service";
import {UserSimilarityRepository} from "@/lib/server/domain/user/user-similarity.repository";


const aggregate = {
    count: 5,
    sumMine: 35,
    sumTheirs: 35,
    sumProduct: 255,
    sumMineSquared: 255,
    sumTheirsSquared: 255,
    sumAbsoluteDifference: 0,
    mediaType: MediaType.MOVIES,
};


const createService = () => {
    const repository = {
        getSharedFavMedia: vi.fn().mockResolvedValue([]),
        findCandidateAggregates: vi.fn().mockResolvedValue([
            { ...aggregate, candidateId: 1 },
            { ...aggregate, candidateId: 2, sumAbsoluteDifference: 5 },
        ]),
        getCandidateProfiles: vi.fn().mockResolvedValue([
            {
                id: 1,
                image: null,
                totalRatings: 20,
                name: "FollowedUser",
                privacy: PrivacyType.PUBLIC,
                followStatus: SocialState.ACCEPTED,
            },
            {
                id: 2,
                image: null,
                totalRatings: 15,
                followStatus: null,
                name: "AvailableUser",
                privacy: PrivacyType.PUBLIC,
            },
        ]),
    } as unknown as typeof UserSimilarityRepository;

    return new UserSimilarityService(repository);
};


describe("UserSimilarityService.getTasteMatches", () => {
    it("keeps search results in the regular grid instead of featuring the first result", async () => {
        const result = await createService().getTasteMatches(99, {
            activeTab: "all",
            sorting: "match",
            search: "Followed",
            hideFollowed: false,
        });

        expect(result.items).toHaveLength(1);
        expect(result.featuredMatch).toBeNull();
        expect(result.items[0].name).toBe("FollowedUser");
    });

    it("removes accepted follows when requested", async () => {
        const result = await createService().getTasteMatches(99, {
            activeTab: "all",
            sorting: "match",
            hideFollowed: true,
        });

        expect(result.total).toBe(1);
        expect(result.featuredMatch?.name).toBe("AvailableUser");
    });

    it("excludes private profiles while keeping restricted profiles", async () => {
        const repository = {
            findCandidateAggregates: vi.fn().mockResolvedValue([
                { ...aggregate, candidateId: 3 },
                { ...aggregate, candidateId: 4 },
            ]),
            getCandidateProfiles: vi.fn().mockResolvedValue([
                {
                    id: 3,
                    name: "PrivateUser",
                    image: null,
                    privacy: PrivacyType.PRIVATE,
                    totalRatings: 20,
                    followStatus: null,
                },
                {
                    id: 4,
                    name: "RestrictedUser",
                    image: null,
                    privacy: PrivacyType.RESTRICTED,
                    totalRatings: 20,
                    followStatus: null,
                },
            ]),
            getSharedFavMedia: vi.fn().mockResolvedValue([]),
        } as unknown as typeof UserSimilarityRepository;

        const result = await new UserSimilarityService(repository).getTasteMatches(99, {
            activeTab: "all",
            hideFollowed: false,
            sorting: "match",
        });

        expect(result.total).toBe(1);
        expect(result.featuredMatch?.name).toBe("RestrictedUser");
    });

    it("only queries active media types and falls back from an inactive tab", async () => {
        const repository = {
            findCandidateAggregates: vi.fn().mockResolvedValue([]),
            getCandidateProfiles: vi.fn().mockResolvedValue([]),
            getSharedFavMedia: vi.fn().mockResolvedValue([]),
        } as unknown as typeof UserSimilarityRepository;

        await new UserSimilarityService(repository).getTasteMatches(99, {
            activeTab: MediaType.MANGA,
            hideFollowed: false,
            sorting: "match",
        }, [MediaType.MOVIES, MediaType.GAMES]);

        expect(repository.findCandidateAggregates).toHaveBeenCalledWith(99, [
            MediaType.MOVIES,
            MediaType.GAMES,
        ]);
    });
});
