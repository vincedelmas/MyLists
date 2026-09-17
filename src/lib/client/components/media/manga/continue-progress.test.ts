import {describe, expect, it} from "vitest";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {PROGRESS_MAX} from "@/lib/utils/constants";
import type {ContinueItemFor} from "@/lib/client/components/continue/continue.types";
import {getMangaContinueProgress} from "./continue-progress";


describe("manga continue progress", () => {
    const manga = { mediaType: MediaType.MANGA, currentChapter: 7, chapters: null } as ContinueItemFor<typeof MediaType.MANGA>;

    it("does not invent a total for manga with an unknown chapter count", () => {
        expect(getMangaContinueProgress(manga)).toMatchObject({
            total: null,
            value: 7,
            label: "7 / ? chapters",
            update: { payload: { type: UpdateType.CHAPTER, currentChapter: 8 } },
        });
    });

    it("caps quick updates at the supported progress limit", () => {
        expect(getMangaContinueProgress({ ...manga, currentChapter: PROGRESS_MAX }).update).toBeNull();
    });
});
