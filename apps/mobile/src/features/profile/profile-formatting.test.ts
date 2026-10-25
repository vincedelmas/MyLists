import { describe, expect, it } from "vitest";
import { formatActivity } from "./profile-formatting";

describe("mobile activity payloads", () => {
    it.each([
        ["status", "Planned", "Completed", "Planned → Completed"],
        ["page", 4, 25, "Page 4 → Page 25"],
        ["chapter", 0, 2, "Chapter 0 → Chapter 2"],
        ["tv", [1, 2], [2, 1], "S1 · E2 → S2 · E1"],
        ["rating", null, 0, "Rating: Not set → 0/10"],
        ["favorite", false, true, "Not a favorite → Favorite"],
        ["comment", "Old note", "New note", "Comments: Old note → New note"],
        ["platform", null, "PC", "Platform: Not set → PC"],
        ["redo", 0, 1, "Repeats: 0× → 1×"],
    ] as const)("shows both saved values for %s updates", (updateType, oldValue, newValue, expected) => {
        expect(
            formatActivity(
                { mediaType: "movies", updateType, payload: { old_value: oldValue, new_value: newValue } },
                "score",
            ),
        ).toBe(expected);
    });

    it("converts game minutes to the same hours used by tracking controls", () => {
        expect(
            formatActivity(
                { mediaType: "games", updateType: "playtime", payload: { old_value: 60, new_value: 150 } },
                "score",
            ),
        ).toBe("1 h. → 2.5 h.");
    });

    it("uses the author's feeling labels rather than treating zero as missing", () => {
        expect(
            formatActivity(
                { mediaType: "books", updateType: "rating", payload: { old_value: 0, new_value: 8 } },
                "feeling",
            ),
        ).toBe("Rating: Awful → Loved");
    });
});
