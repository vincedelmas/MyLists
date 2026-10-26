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
    return { AppText: children, Content: children, Page: children, Section: children };
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
    it.each([
        ["Trends", "/trends"],
        ["Hall of fame", "/hall-of-fame"],
        ["Moviedle", "/moviedle"],
    ])("opens the correct native screen when pressing %s", (label, destination) => {
        buttons.get(label)!();
        expect(push).toHaveBeenCalledExactlyOnceWith(destination);
        expect(openBrowser).not.toHaveBeenCalled();
    });

    it("keeps web-only destinations in the browser", () => {
        buttons.get("Platform stats. Opens in browser")!();
        expect(openBrowser).toHaveBeenCalledWith("https://mylists.example/platform-stats");
        expect(push).not.toHaveBeenCalled();
    });
});
