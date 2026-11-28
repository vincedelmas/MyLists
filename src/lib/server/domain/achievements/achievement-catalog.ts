import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import type {AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementCalculation = (userId?: number) => AchievementCalculationRow[];

export type AchievementCalculationRow = {
    value: number;
    userId: number;
    label?: string | null;
};

export type AchievementTrigger =
    | "status"
    | "dropped"
    | "rating"
    | "comment"
    | "favorite"
    | "redo"
    | "progress"
    | "platform"
    | "game-achievements"
    | "book-details"
    | "wcf";


type AchievementEntry = Omit<AchievementSeedData, "codeName" | "category" | "mediaType" | "sortOrder"> & {
    calculate?: AchievementCalculation;
    triggers?: readonly AchievementTrigger[];
};


type AchievementCatalogOptions<TCategory extends AchievementCategory, TEntries extends Record<string, AchievementEntry>> = {
    entries: TEntries;
    category: TCategory;
    mediaType: MediaType | null;
};


export const defineAchievementCatalog = <
    TCategory extends AchievementCategory,
    TEntries extends Record<string, AchievementEntry>,
>({ category, mediaType, entries }: AchievementCatalogOptions<TCategory, TEntries>) => {
    const definitions: AchievementSeedData[] = Object.entries(entries).map(([codeName, entry], index) => {
        const { calculate: _calculate, triggers: _triggers, ...definition } = entry;

        return {
            ...definition,
            codeName,
            category,
            mediaType,
            sortOrder: index + 1,
            secret: definition.secret ?? false,
        };
    });

    return {
        category,
        mediaType,
        definitions,
        getCalculator(codeName: string): AchievementCalculation | null {
            const entry = entries[codeName];
            if (!entry) throw new Error(`Invalid achievement codeName: ${codeName}`);
            return entry.calculate ?? null;
        },
        matchesTriggers(codeName: string, activeTriggers?: readonly AchievementTrigger[]): boolean {
            if (!activeTriggers || activeTriggers.length === 0) return true;
            const entry = entries[codeName];
            if (!entry?.triggers || entry.triggers.length === 0) return true;
            return entry.triggers.some((trigger) => activeTriggers.includes(trigger));
        },
    };
};


export type AchievementCatalog = ReturnType<typeof defineAchievementCatalog>;
