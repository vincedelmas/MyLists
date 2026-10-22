import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

const {push, getState, getParent} = vi.hoisted(() => {
    const getState = vi.fn();
    return {push: vi.fn(), getState, getParent: vi.fn(() => ({getState}))};
});
vi.mock("expo-router", () => ({router: {push}}));
vi.mock("expo-router/react-navigation", () => ({useNavigation: () => ({getParent})}));

import {useTabPush} from "./use-tab-push";

let navigate: ReturnType<typeof useTabPush>;
function Harness() {
    navigate = useTabPush();
    return null;
}

beforeEach(() => {
    vi.clearAllMocks();
    renderToStaticMarkup(createElement(Harness));
});

describe("tab detail navigation", () => {
    it.each(["(profile)", "(library)", "(search)", "(community)"])("preserves the %s tab and destination parameters", (tab) => {
        getState.mockReturnValue({index: 1, routes: [{name: "other"}, {name: tab}]});
        navigate({pathname: "/media/[mediaType]/[mediaId]", params: {mediaType: "anime", mediaId: "42"}});
        expect(push).toHaveBeenCalledWith({
            pathname: `/(tabs)/${tab}/media/[mediaType]/[mediaId]`,
            params: {mediaType: "anime", mediaId: "42"},
        });
    });

    it("reads the selected tab when pressed rather than when rendered", () => {
        expect(getState).not.toHaveBeenCalled();
        getState.mockReturnValue({index: 0, routes: [{name: "(profile)"}]});
        navigate("/profile/social");
        getState.mockReturnValue({index: 0, routes: [{name: "(library)"}]});
        navigate("/profile/social");
        expect(push.mock.calls).toEqual([
            [{pathname: "/(tabs)/(profile)/profile/social"}],
            [{pathname: "/(tabs)/(library)/profile/social"}],
        ]);
    });
});
