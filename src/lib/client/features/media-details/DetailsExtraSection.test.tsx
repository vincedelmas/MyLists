import {renderToString, renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {
    DetailsExtraErrorFallback,
    DetailsExtraSection,
} from "./DetailsExtraSection";


describe("details extra section boundaries", () => {
    it("renders an independently resolved extra", () => {
        expect(renderToStaticMarkup(
            <DetailsExtraSection title="Community activity"><p>Loaded activity</p></DetailsExtraSection>,
        )).toContain("Loaded activity");
    });

    it("renders its own Suspense fallback without replacing the details page", () => {
        const Pending = () => {
            throw new Promise(() => undefined);
        };
        expect(renderToString(
            <main><h1>Media title</h1><DetailsExtraSection title="Community activity"><Pending/></DetailsExtraSection></main>,
        )).toMatch(/Media title[\s\S]*Loading Community activity/);
    });

    it("renders a local error state for one failed extra", () => {
        expect(renderToStaticMarkup(<DetailsExtraErrorFallback title="Community collections"/>))
            .toContain("Community collections is temporarily unavailable.");
    });
});
