import {describe, expect, it} from "vitest";
import {MEDIA_TYPES, MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {setupMediaModule} from "@/lib/server/core/container/media.module";


describe("media module composition", () => {
    it("registers one complete, type-specific capability module per media kind", () => {
        const registry = setupMediaModule({} as ApiClientModule);

        expect(registry.values().map(({ kind }) => kind)).toEqual([...MEDIA_TYPES]);
        expect(registry.values()).toHaveLength(MEDIA_TYPES.length);
        expect(registry.get(MediaType.SERIES).library.read.getUserMediaHistory).toBeTypeOf("function");
        expect(registry.get(MediaType.ANIME).contributions.imports.matcher.match).toBeTypeOf("function");
        expect(registry.get(MediaType.MOVIES).external.trends?.getTrends).toBeTypeOf("function");
        expect(registry.get(MediaType.GAMES).catalog.read.getCompatiblePlatforms).toBeTypeOf("function");
        expect(registry.get(MediaType.BOOKS).catalog.contributeCover.contribute).toBeTypeOf("function");
        expect(registry.get(MediaType.MANGA).catalog.ingestion.refreshFromExternal).toBeTypeOf("function");
        expect(registry.get(MediaType.MOVIES).library.export.csv).toBeTypeOf("function");
        expect(registry.get(MediaType.GAMES).library.stats.rebuild).toBeTypeOf("function");
        expect(registry.get(MediaType.BOOKS).catalog.maintenance.orphans.find).toBeTypeOf("function");
        expect(registry.get(MediaType.MANGA).contributions.achievements.calculator.getAchievementCte).toBeTypeOf("function");
        expect(registry.get(MediaType.SERIES).contributions.activity.catalog.getMediaDetailsByIds).toBeTypeOf("function");
    });

    it("makes optional capabilities visible through module composition", () => {
        const registry = setupMediaModule({} as ApiClientModule);

        expect(registry.get(MediaType.MOVIES).contributions.mediadle.eligibility.pickEligibleId).toBeTypeOf("function");
        expect(registry.get(MediaType.GAMES).contributions.whichCameFirst.catalog.getPopularMediaRefs).toBeTypeOf("function");
        expect("features" in registry.get(MediaType.BOOKS)).toBe(false);

        expect(registry.get(MediaType.ANIME).notifications.upcoming.create).toBeTypeOf("function");
        expect("notifications" in registry.get(MediaType.GAMES)).toBe(false);
        expect(registry.get(MediaType.GAMES).library.upcoming.forOwner).toBeTypeOf("function");

        expect(registry.get(MediaType.BOOKS).catalog.refresh.selfServiceAllowed).toBe(false);
        expect(registry.get(MediaType.MANGA).catalog.refresh.selfServiceAllowed).toBe(true);
    });
});
