import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import type {AchievementSeedData} from "@/lib/types/achievements.types";


export type AchievementCalculation = (userId?: number) => AchievementCalculationRow[];

export type AchievementCalculationRow = {
    value: number;
    userId: number;
    label?: string | null;
};


type AchievementEntry = Omit<AchievementSeedData, "codeName" | "category" | "mediaType" | "sortOrder"> & {
    calculate?: AchievementCalculation;
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
        const { calculate: _calculate, ...definition } = entry;

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
    };
};


export type AchievementCatalog = ReturnType<typeof defineAchievementCatalog>;
