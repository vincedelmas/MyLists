import React from "react";
import {describe, expect, it, vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {MediaType} from "@/lib/utils/enums";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardMeta,
    MediaCardSignals,
    MediaCardTitle,
} from "@/lib/client/components/media/base/MediaCard";


vi.mock("@tanstack/react-router", () => ({
    Link: ({ children }: { children: React.ReactNode }) => <a href="#media-card">{children}</a>,
}));


describe("MediaCard composition", () => {
    it("requires a footer to be nested within a card", () => {
        expect(() => renderToStaticMarkup(
            <MediaCardFooter>Footer</MediaCardFooter>
        )).toThrow("MediaCardFooter must be used within MediaCard.");
    });

    it("requires details to be nested within meta", () => {
        expect(() => renderToStaticMarkup(
            <MediaCardDetails>2026</MediaCardDetails>
        )).toThrow("MediaCardDetails must be used within MediaCardMeta.");
    });

    it("requires signals to be nested within meta", () => {
        expect(() => renderToStaticMarkup(
            <MediaCardSignals>Favorite</MediaCardSignals>
        )).toThrow("MediaCardSignals must be used within MediaCardMeta.");
    });

    it("requires meta to be nested within a footer", () => {
        expect(() => renderToStaticMarkup(
            <MediaCardMeta>Metadata</MediaCardMeta>
        )).toThrow("MediaCardMeta must be used within MediaCardFooter.");
    });

    it("renders the supported composition", () => {
        const output = renderToStaticMarkup(
            <MediaCard
                mediaType={MediaType.MOVIES}
                item={{ mediaId: 1, mediaName: "Example", imageCover: "/cover.jpg" }}
            >
                <MediaCardFooter>
                    <MediaCardTitle>Example</MediaCardTitle>
                    <MediaCardMeta>
                        <MediaCardDetails>2026</MediaCardDetails>
                        <MediaCardSignals>Favorite</MediaCardSignals>
                    </MediaCardMeta>
                </MediaCardFooter>
            </MediaCard>
        );

        expect(output).toContain("data-slot=\"media-card-details\"");
        expect(output).toContain("data-slot=\"media-card-signals\"");
    });
});
