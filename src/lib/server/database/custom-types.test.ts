import {describe, expect, it} from "vitest";
import {sqliteTable} from "drizzle-orm/sqlite-core";
import {customJson} from "./custom-types";


const columns = sqliteTable("json_serialization_test", {
    json: customJson<unknown>("json"),
    authJson: customJson<unknown>("auth_json", { acceptSerialized: true }),
});


describe("customJson", () => {
    it.each([{ value: ["summer"] }, { value: { count: 1 } }, { value: "plain string" }])("preserves ordinary JSON serialization for %j", ({ value }) => {
        const serialized = columns.json.mapToDriverValue(value);
        expect(serialized).toBe(JSON.stringify(value));
        expect(columns.json.mapFromDriverValue(serialized)).toEqual(value);
    });

    it.each(['["mylists:read", "mylists:write"]', '{"client":"assistant"}'])("keeps adapter-serialized JSON intact: %s", serialized => {
        expect(columns.authJson.mapToDriverValue(serialized)).toBe(serialized);
        expect(columns.authJson.mapFromDriverValue(serialized)).toEqual(JSON.parse(serialized));
    });

    it("also serializes values written directly through Drizzle", () => {
        const scopes = ["mylists:read"];
        const serialized = columns.authJson.mapToDriverValue(scopes);
        expect(serialized).toBe(JSON.stringify(scopes));
        expect(columns.authJson.mapFromDriverValue(serialized)).toEqual(scopes);
    });
});
