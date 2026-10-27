import {createElement, type ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";


const { buttons, push, openBrowser } = vi.hoisted(() => ({
    buttons: new Map<string, () => void>(), push: vi.fn(), openBrowser: vi.fn(),
}));


vi.mock("../../hooks/use-tab-push", () => ({ useTabPush: () => push }));


vi.mock("../../lib/config", () => ({ backendUrl: "https://mylists.example" }));


vi.mock("expo-web-browser", () => ({ openBrowserAsync: openBrowser }));


vi.mock("react-native", () => ({
    Alert: { alert: vi.fn() },
    StyleSheet: { create: (styles: object) => styles },
    View: ({ children }: { children: ReactNode }) => children,
    Pressable: (props: { accessibilityLabel: string; onPress: () => void; children: ReactNode }) => {
        buttons.set(props.accessibilityLabel, props.onPress);

        return props.children;
    },
}));


vi.mock("../../components/ui", () => {
    const children = ({ children }: { children: ReactNode }) => children;

    return {
        AppText: children,
        Content: children,
        Page: children,
        Section: ({ title, children }: { title: string; children: ReactNode }) => createElement("section", { "aria-label": title }, children)
    };
});


vi.mock("lucide-react-native", () => Object.fromEntries([
    "ChartNoAxesCombined", "Clapperboard", "ExternalLink", "HeartHandshake", "History", "LibraryBig", "Coffee", "TrendingUp", "Trophy",
].map(name => [name, () => null])));


import {CommunityScreen} from "./CommunityScreen";


beforeEach(() => {
    vi.clearAllMocks();
    buttons.clear();
    openBrowser.mockResolvedValue({ type: "dismiss" });
    renderToStaticMarkup(createElement(CommunityScreen));
});


describe("community row navigation", () => {
    it("groups native screens separately and labels all four browser destinations", () => {
        const markup = renderToStaticMarkup(createElement(CommunityScreen));

        expect(markup).toContain('aria-label="In the app"');
        expect(markup).toContain('aria-label="Explore on the web"');
        expect(markup.match(/Web only/g)).toHaveLength(4);
        expect(markup.indexOf("Trends")).toBeLessThan(markup.indexOf("Moviedle"));
        expect(markup.indexOf("Community collections")).toBeLessThan(markup.indexOf("Moviedle"));
    });

    it.each([
        ["Trends", "/trends"],
        ["Hall of fame", "/hall-of-fame"],
        ["Community collections", "/collections"],
    ])("opens the correct native screen when pressing %s", (label, destination) => {
        buttons.get(label)!();
        expect(push).toHaveBeenCalledExactlyOnceWith(destination);
        expect(openBrowser).not.toHaveBeenCalled();
    });

    it.each([
        ["Moviedle", "/moviedle"],
        ["Which came first?", "/which-came-first"],
        ["Taste matches", "/taste-matches"],
        ["Platform stats", "/platform-stats"],
    ])("keeps %s in the browser", (label, path) => {
        buttons.get(`${label}. Opens in browser`)!();
        expect(openBrowser).toHaveBeenCalledWith(`https://mylists.example${path}`);
        expect(push).not.toHaveBeenCalled();
    });
});
