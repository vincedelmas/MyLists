import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {MonthlyActivityStatusIcons} from "@/lib/client/components/activity/MonthlyActivityStatusIcons";


describe("MonthlyActivityStatusIcons", () => {
    it("shows only the final status from the latest yearly occurrence", () => {
        const row: MonthlyActivityEditor = {
            id: 2,
            mediaId: 10,
            hidden: false,
            mediaType: MediaType.BOOKS,
            mediaName: "Yearly book",
            mediaCover: "cover.jpg",
            timeGained: 200,
            progressGained: 100,
            redoGained: 0,
            hadCompletion: true,
            lastActivityAt: "2026-08-10T12:00:00.000Z",
            occurrences: [
                {
                    id: 2,
                    hidden: false,
                    monthBucket: "2026-08",
                    timeGained: 120,
                    progressGained: 60,
                    redoGained: 0,
                    hadCompletion: true,
                    lastActivityAt: "2026-08-10T12:00:00.000Z",
                },
                {
                    id: 1,
                    hidden: false,
                    monthBucket: "2026-01",
                    timeGained: 80,
                    progressGained: 40,
                    redoGained: 0,
                    hadCompletion: false,
                    lastActivityAt: "2026-01-10T12:00:00.000Z",
                },
            ],
        };

        const output = renderToStaticMarkup(<MonthlyActivityStatusIcons row={row}/>);

        expect(output).toContain("Latest activity: Completed");
        expect(output).not.toContain("Latest activity: Progressed");
    });
});
