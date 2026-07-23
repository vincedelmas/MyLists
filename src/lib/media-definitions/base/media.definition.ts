import type {MediaType} from "@/lib/utils/enums";


type MediaProgressTiming =
    | Readonly<{
    kind: "fixed";
    minutesPerUnit: number;
}>
    | Readonly<{
    kind: "media-duration";
    fallbackMinutes: number;
}>
    | Readonly<{
    kind: "stored-minutes";
    minutesPerInputUnit: number;
}>;


type MediaStatsDefinition = Readonly<{
    progress?: Readonly<{
        redoLabel: string;
        totalSpecificLabel: string;
    }>;
    durationDistribution: Readonly<{
        unit: string;
        label: string;
    }>;
}>;


type MediaProgressDefinition = Readonly<{
    inputStep: number;
    timing: MediaProgressTiming;
    unit?: Readonly<{
        long: string;
        short: string;
        plural: string;
        singular: string;
    }>;
}>;


export type MediaDefinition<TMediaType extends MediaType = MediaType> = Readonly<{
    statistics: MediaStatsDefinition;
    progress: MediaProgressDefinition;
    identity: Readonly<{
        mediaType: TMediaType;
    }>;
    terminology: Readonly<{
        entry: Readonly<{
            plural: string;
            singular: string;
        }>;
    }>;
}>;


export const defineMediaDefinition = <const TDefinition extends MediaDefinition>(definition: TDefinition) => {
    return definition;
};
