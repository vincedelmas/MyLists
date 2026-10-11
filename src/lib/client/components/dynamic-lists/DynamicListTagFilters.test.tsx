import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MediaTagFilters} from "@/lib/client/components/media/browse/MediaTagFilters";
import {DynamicListTagFilters} from "./DynamicListTagFilters";


vi.mock("@/lib/client/components/media/browse/MediaTagFilters", () => ({
    MediaTagFilters: vi.fn(() => null),
}));

beforeEach(() => vi.clearAllMocks());


describe("dynamic list tag editing", () => {
    it.each(["tags", "excludeTags"] as const)("preserves remaining %s IDs when saved tags are unavailable in the directory", field => {
        const onChange = vi.fn();
        renderToStaticMarkup(<DynamicListTagFilters
            rules={[{ [field]: [1, 2] }]}
            tagNames={{ 1: "cozy", 2: "short" }}
            options={[]}
            errors={{}}
            disabled={false}
            onChange={onChange}
        />);

        vi.mocked(MediaTagFilters).mock.calls[0][0].onChange({ [field]: ["cozy"] });

        expect(onChange).toHaveBeenCalledWith([{ [field]: [1] }]);
    });

    it("maps new directory selections to their IDs without changing other rules", () => {
        const onChange = vi.fn();
        renderToStaticMarkup(<DynamicListTagFilters
            rules={[{ tags: [1] }, { excludeTags: [2] }]}
            tagNames={{ 1: "cozy", 2: "short" }}
            options={[{ id: 3, name: "weekend" }]}
            errors={{}}
            disabled={false}
            onChange={onChange}
        />);

        vi.mocked(MediaTagFilters).mock.calls[0][0].onChange({ tags: ["cozy", "weekend"] });

        expect(onChange).toHaveBeenCalledWith([{ tags: [1, 3] }, { excludeTags: [2] }]);
    });
});
