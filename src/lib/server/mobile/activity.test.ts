import { beforeEach, describe, expect, it, vi } from "vitest";
import { withMobileActivityCovers } from "./activity";

const mocks = vi.hoisted(() => ({ all: vi.fn(), select: vi.fn() }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "uploads" } }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => ({ select: mocks.select }) }));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.select.mockImplementation(() => ({ from: () => ({ where: () => ({ all: mocks.all }) }) }));
});

describe("activity cover enrichment", () => {
    it("batches repeated media references by type and keeps update order", () => {
        mocks.all
            .mockReturnValueOnce([{ id: 7, cover: "http://localhost:3000/uploads/movies/film.jpg" }])
            .mockReturnValueOnce([{ id: 7, cover: "http://localhost:3000/uploads/books/book.jpg" }]);
        const updates = [
            { id: 1, mediaType: "movies" as const, mediaId: 7 },
            { id: 2, mediaType: "movies" as const, mediaId: 7 },
            { id: 3, mediaType: "books" as const, mediaId: 7 },
        ];
        expect(withMobileActivityCovers(updates).map((item) => [item.id, item.cover])).toEqual([
            [1, "/uploads/movies/film.jpg"],
            [2, "/uploads/movies/film.jpg"],
            [3, "/uploads/books/book.jpg"],
        ]);
        expect(mocks.select).toHaveBeenCalledTimes(2);
    });

    it("keeps deleted-media history with an empty cover and skips empty queries", () => {
        expect(withMobileActivityCovers([])).toEqual([]);
        expect(mocks.select).not.toHaveBeenCalled();
        mocks.all.mockReturnValue([]);
        expect(withMobileActivityCovers([{ mediaType: "movies", mediaId: 99 }])).toEqual([
            { mediaType: "movies", mediaId: 99, cover: null },
        ]);
    });
});
