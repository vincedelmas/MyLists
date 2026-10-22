import {createRequire} from "node:module";
import path from "node:path";
import {describe, expect, it} from "vitest";

const require = createRequire(import.meta.url);
const metroRequire = createRequire(require.resolve("@expo/metro-config/package.json"));
const babel = metroRequire("@babel/core") as typeof import("@babel/core");

describe("mobile Babel compatibility", () => {
    it("transforms Expo UI's real worklets with Metro and the installed Worklets plugin", () => {
        // Worklets runs a second Babel transform internally. Checking only Metro's
        // compiler version misses an incompatible hoisted @babel/core peer.
        const source = path.resolve(path.dirname(require.resolve("@expo/ui")), "../State/index.fx.js");
        const result = babel.transformFileSync(source, {
            babelrc: false,
            configFile: false,
            plugins: [require.resolve("react-native-worklets/plugin")],
        });
        expect(result?.code).toContain("__workletHash");
    });
});
