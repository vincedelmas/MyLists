import {describe, expect, it, vi} from "vitest";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";


describe("MonthlyActivityService visibility", () => {
    const filters = {
        username: "activity-owner",
        year: 2026,
        month: 1,
        page: 1,
        search: "",
        view: "year" as const,
        hiddenOnly: true,
        activeTab: "all" as const,
        activityKind: ActivityKind.ALL,
    };
    const repository = {
        getMonthlyMediaTypes: vi.fn(() => []),
        getPaginatedYearlyActivities: vi.fn(() => ({
            items: [],
            total: 0,
            page: 1,
            pages: 0,
            perPage: 48,
        })),
        getPaginatedMonthlyActivities: vi.fn(() => ({
            items: [],
            total: 0,
            page: 1,
            pages: 0,
            perPage: 48,
        })),
    };
    const service = new MonthlyActivityService(repository as any, { get: vi.fn() } as any);

    it("rejects hidden activity requests from non-owners", async () => {
        await expect(service.getMonthlyActivity(1, filters, false)).rejects.toThrow(
            "Hidden activity is only available to the profile owner",
        );
        expect(repository.getPaginatedMonthlyActivities).not.toHaveBeenCalled();
    });

    it("allows the profile owner to inspect hidden activity", async () => {
        await expect(service.getMonthlyActivity(1, filters, true)).resolves.toMatchObject({ items: [], total: 0 });
        expect(repository.getPaginatedYearlyActivities).toHaveBeenCalled();
        expect(repository.getPaginatedMonthlyActivities).not.toHaveBeenCalled();
    });
});


describe("MonthlyActivityService yearly consolidation", () => {
    it("returns aggregate card totals and converted month occurrences", async () => {
        const latestOccurrence = {
            id: 2,
            userId: 1,
            mediaId: 10,
            hidden: false,
            mediaType: MediaType.BOOKS,
            monthBucket: "2026-08",
            progressGained: 60,
            redoGained: 2,
            hadCompletion: true,
            lastActivityAt: "2026-08-10T12:00:00.000Z",
        };
        const firstOccurrence = {
            ...latestOccurrence,
            id: 1,
            monthBucket: "2026-01",
            progressGained: 40,
            redoGained: 1,
            hadCompletion: false,
            lastActivityAt: "2026-01-10T12:00:00.000Z",
        };
        const repository = {
            getMonthlyMediaTypes: vi.fn(() => [MediaType.BOOKS]),
            getPaginatedYearlyActivities: vi.fn(() => ({
                items: [{
                    ...latestOccurrence,
                    progressGained: 100,
                    redoGained: 3,
                    occurrences: [latestOccurrence, firstOccurrence],
                }],
                total: 1,
                page: 1,
                pages: 1,
                perPage: 48,
            })),
        };
        const monthlyActivity = {
            getMediaByIds: vi.fn(() => [{
                id: 10,
                name: "Yearly book",
                imageCover: "cover.jpg",
                duration: null,
                rating: null,
                favorite: null,
                releaseDate: null,
            }]),
            progressToMinutes: vi.fn((progress: number) => progress * 2),
        };
        const service = new MonthlyActivityService(repository as any, { get: () => monthlyActivity } as any);

        const result = await service.getMonthlyActivity(1, {
            username: "activity-owner",
            year: 2026,
            month: 1,
            page: 1,
            search: "",
            view: "year",
            hiddenOnly: false,
            activeTab: MediaType.BOOKS,
            activityKind: ActivityKind.ALL,
        });

        expect(result.items[0]).toMatchObject({
            mediaName: "Yearly book",
            progressGained: 100,
            redoGained: 3,
            timeGained: 200,
        });
        expect(result.items[0].occurrences).toMatchObject([
            { monthBucket: "2026-08", timeGained: 120, hadCompletion: true },
            { monthBucket: "2026-01", timeGained: 80, hadCompletion: false },
        ]);
    });
});
