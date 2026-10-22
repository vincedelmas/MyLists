import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMobileMoviedle, guessMobileMoviedle, moviedleGuessSchema, getMobileMoviedleLeaderboard } from "./moviedle";

const mocks = vi.hoisted(() => ({
    daily: vi.fn(),
    today: vi.fn(),
    guess: vi.fn(),
    find: vi.fn(),
    leaderboard: vi.fn(),
}));
const movies = { findById: mocks.find };
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/domain/mediadle/mediadle.repository", () => ({
    MediadleRepository: { getTodayMoviedle: mocks.today },
}));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            mediadle: {
                getDailyMediadleData: mocks.daily,
                addMediadleGuess: mocks.guess,
                getLeaderboard: mocks.leaderboard,
            },
        },
        registries: { mediaService: { get: () => movies } },
    }),
}));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.today.mockReturnValue({ id: 12 });
    mocks.daily.mockResolvedValue({
        mediadleId: 12,
        pixelatedCover: "pixels",
        maxAttempts: 6,
        result: null,
        userData: { attempts: 1, completed: false },
    });
});
describe("mobile Moviedle", () => {
    it("uses the signed-in player's puzzle and does not reveal the movie before completion", async () => {
        const data = await getMobileMoviedle(7);
        expect(mocks.daily).toHaveBeenCalledWith(movies, 7);
        expect(data.result).toBeNull();
        expect(mocks.find).not.toHaveBeenCalled();
        expect(new Date(data.resetsAt).getUTCHours()).toBe(0);
    });
    it("reveals the title and instance-relative poster only after completion", async () => {
        mocks.daily.mockResolvedValue({
            result: { mediaId: 22, nonPixelatedCover: "http://localhost:3000/poster.jpg" },
        });
        mocks.find.mockReturnValue({ name: "A Movie" });
        expect((await getMobileMoviedle(7)).result).toEqual({ mediaId: 22, name: "A Movie", cover: "/poster.jpg" });
    });
    it("uses the common game service for guesses and skips without regenerating the poster", async () => {
        await guessMobileMoviedle(7, { mediadleId: 12, action: "guess", guess: "A Movie" });
        expect(mocks.guess).toHaveBeenCalledWith(7, "A Movie", movies);
        await guessMobileMoviedle(7, { mediadleId: 12, action: "skip" });
        expect(mocks.guess).toHaveBeenLastCalledWith(7, "rtehsqqt", movies);
        expect(mocks.daily).not.toHaveBeenCalled();
    });
    it("does not consume an attempt when the client is on yesterday's puzzle", async () => {
        await expect(guessMobileMoviedle(7, { mediadleId: 11, action: "skip" })).rejects.toThrow("new puzzle");
        expect(mocks.guess).not.toHaveBeenCalled();
    });
    it("validates the puzzle identity and nonempty guesses", () => {
        expect(moviedleGuessSchema.safeParse({ action: "skip" }).success).toBe(false);
        expect(moviedleGuessSchema.safeParse({ mediadleId: 12, action: "guess", guess: "  " }).success).toBe(false);
    });
    it("keeps the same leaderboard and converts avatar paths for mobile", async () => {
        const entry = { userId: 7, rank: 1, image: "http://localhost:3000/avatar.jpg" };
        mocks.leaderboard.mockReturnValue({ entries: [entry], currentUserEntry: entry });
        const result = await getMobileMoviedleLeaderboard(7);
        expect(mocks.leaderboard).toHaveBeenCalledWith(7);
        expect(result.entries[0].image).toBe("/avatar.jpg");
        expect(result.currentUserEntry?.rank).toBe(1);
    });
});
