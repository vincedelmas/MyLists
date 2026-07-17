import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {setupMediaModule} from "@/lib/server/core/container/media.module";


describe("media module composition", () => {
    it("registers one complete, type-specific capability module per media kind", () => {
        const { registry } = setupMediaModule({} as ApiClientModule);

        expect(registry.values().map(({ kind }) => kind)).toEqual(expect.arrayContaining(Object.values(MediaType)));
        expect(registry.values()).toHaveLength(Object.values(MediaType).length);
        expect(registry.get(MediaType.SERIES).library.read.getUserMediaHistory).toBeTypeOf("function");
        expect(registry.get(MediaType.ANIME).imports.matcher.match).toBeTypeOf("function");
        expect(registry.get(MediaType.MOVIES).external.trends?.getTrends).toBeTypeOf("function");
        expect(registry.get(MediaType.GAMES).catalog.read.getCompatiblePlatforms).toBeTypeOf("function");
        expect(registry.get(MediaType.BOOKS).catalog.contributeCover.contribute).toBeTypeOf("function");
        expect(registry.get(MediaType.MANGA).catalog.ingestion.refreshFromExternal).toBeTypeOf("function");
    });
});
