import {describe, expect, it, vi} from "vitest";
import {ActivityKind} from "@/lib/utils/enums";
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
        expect(repository.getPaginatedMonthlyActivities).toHaveBeenCalled();
    });
});
