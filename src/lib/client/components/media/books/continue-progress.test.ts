import {describe, expect, it} from "vitest";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import type {ContinueItemFor} from "@/lib/client/components/continue/continue.types";
import {getBooksContinueProgress} from "./continue-progress";


describe("books continue progress", () => {
    it("shows the current page against the book length and clamps the last quick update", () => {
        const book = { mediaType: MediaType.BOOKS, actualPage: 95, pages: 100 } as ContinueItemFor<typeof MediaType.BOOKS>;
        expect(getBooksContinueProgress(book)).toMatchObject({
            value: 95,
            total: 100,
            label: "95 / 100 pages",
            actionLabel: "+ 5 pages",
            update: { payload: { type: UpdateType.PAGE, actualPage: 100 } },
        });
    });
});
