import {describe, expect, it} from "vitest";
import {getPersonalRanking, getRankingLevel, type PersonalRanks, type RankedUser} from "./hall-of-fame";

const minutes = (level: number) => 20 * level * (level + 1);
const user: RankedUser = {
    id: 1, name: "Ranked user", image: null, privacy: "public", isOwn: false, rank: 4,
    totalTime: minutes(50),
    settings: [
        { mediaType: "series", active: true, timeSpent: minutes(12) },
        { mediaType: "books", active: false, timeSpent: minutes(30) },
    ],
};

const ranks: PersonalRanks = [
    { mediaType: "series", rank: 4, percent: 20, active: true },
    { mediaType: "movies", rank: 24, percent: 6.2, active: true },
    { mediaType: "books", rank: 1, percent: 1, active: false },
    { mediaType: "games", rank: 2, percent: null, active: true },
];

describe("phone leaderboard metrics", () => {
    it("shows the selected media's level instead of repeating the profile level", () => {
        expect(getRankingLevel(user, "normalized")).toBe(50);
        expect(getRankingLevel(user, "profile")).toBe(50);
        expect(getRankingLevel(user, "series")).toBe(12);
    });

    it("does not publish retained levels for an inactive or absent media list", () => {
        expect(getRankingLevel(user, "books")).toBeNull();
        expect(getRankingLevel(user, "anime")).toBeNull();
    });

    it("uses percentile, rather than absolute position, for the best-category summary", () => {
        expect(getPersonalRanking(ranks, "normalized")).toBe(ranks[1]);
        expect(getPersonalRanking(ranks, "profile")).toBe(ranks[1]);
    });

    it("keeps the personal summary on the selected category even when it is inactive", () => {
        expect(getPersonalRanking(ranks, "series")).toBe(ranks[0]);
        expect(getPersonalRanking(ranks, "books")).toBe(ranks[2]);
    });

    it("does not invent a best ranking when no active percentile is available", () => {
        expect(getPersonalRanking([ranks[2], ranks[3]], "normalized")).toBeUndefined();
    });
});
