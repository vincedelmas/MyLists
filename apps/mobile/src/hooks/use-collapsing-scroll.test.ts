import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import {CollapsingScrollContext, useCollapsingScroll} from "./use-collapsing-scroll";

function renderScroll(viewportHeight = 640) {
    const getOffset = vi.fn(() => 150);
    const value = {
        onScroll: vi.fn(),
        initialOffset: 150,
        getOffset,
        headerHeight: 240,
        tabBarHeight: 49,
        viewportHeight,
    };
    let result: ReturnType<typeof useCollapsingScroll>;

    function Harness() {
        result = useCollapsingScroll();
        return null;
    }

    renderToStaticMarkup(createElement(CollapsingScrollContext.Provider, { value }, createElement(Harness)));
    return { scroll: result!, getOffset };
}

describe("collapsing profile scroll panes", () => {
    it("supports standalone pages without reserving space for a profile header", () => {
        let scroll: ReturnType<typeof useCollapsingScroll>;

        function Standalone() {
            scroll = useCollapsingScroll();
            return null;
        }

        renderToStaticMarkup(createElement(Standalone));
        expect(scroll!.contentContainerStyle.paddingTop).toBe(16);
        expect(scroll!.contentContainerStyle.minHeight).toBe(0);
        expect(scroll!.scrollProps.contentOffset.y).toBe(0);
    });

    it("reserves the header and tabs while allowing even short content to collapse the header", () => {
        const { scroll } = renderScroll();
        expect(scroll.contentContainerStyle.paddingTop).toBe(240 + 49 + 16);
        expect(scroll.contentContainerStyle.minHeight).toBe(640 + 240);
        expect(scroll.scrollProps.contentOffset).toEqual({ x: 0, y: 150 });
    });

    it("captures the offset before initial native events and restores it once content is laid out", () => {
        const { scroll, getOffset } = renderScroll();
        const scrollTo = vi.fn();
        scroll.scrollProps.ref({ getScrollResponder: () => ({ scrollTo }) });
        getOffset.mockReturnValue(0);
        scroll.scrollProps.onContentSizeChange();
        expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 150, animated: false });
    });

    it("does not reset scrolling when covers load or accordion content changes size", () => {
        const { scroll } = renderScroll();
        const scrollTo = vi.fn();
        scroll.scrollProps.ref({ getScrollResponder: () => ({ scrollTo }) });
        scroll.scrollProps.onContentSizeChange();
        scroll.scrollProps.onContentSizeChange();
        expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("restores the current position when a loading pane is replaced by its list", () => {
        const { scroll, getOffset } = renderScroll();
        const loadingScroll = vi.fn();
        scroll.scrollProps.ref({ getScrollResponder: () => ({ scrollTo: loadingScroll }) });
        scroll.scrollProps.onContentSizeChange();
        scroll.scrollProps.ref(null);
        getOffset.mockReturnValue(260);
        const listScroll = vi.fn();
        scroll.scrollProps.ref({ getScrollResponder: () => ({ scrollTo: listScroll }) });
        scroll.scrollProps.onContentSizeChange();
        expect(listScroll).toHaveBeenCalledWith({ x: 0, y: 260, animated: false });
    });

    it("waits for the viewport measurement before restoring", () => {
        const { scroll } = renderScroll(0);
        const scrollTo = vi.fn();
        scroll.scrollProps.ref({ getScrollResponder: () => ({ scrollTo }) });
        scroll.scrollProps.onContentSizeChange();
        expect(scrollTo).not.toHaveBeenCalled();
    });
});
