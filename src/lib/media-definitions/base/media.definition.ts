import type {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import type {ContinueDefinition} from "@/lib/media-definitions/base/continue.definition";


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
    affinities: ReadonlyArray<Readonly<{
        key: `${string}Stats`;
        label: string;
        job?: JobType;
    }>>;
    repeat: Readonly<{
        label: string;
        rateLabel: string;
    }>;
    timeComparison: Readonly<{
        referenceHours: number;
        referenceLabel: string;
        secondaryHours: number;
        secondaryLabel: string;
    }>;
    progress?: Readonly<{
        redoLabel: string;
        totalSpecificLabel: string;
    }>;
    durationDistribution: Readonly<{
        unit: string;
        label: string;
        rangeMode?: "continuous" | "integer";
    }>;
}>;


type MediaProgressDefinition = Readonly<{
    inputStep: number;
    timing: MediaProgressTiming;
    unit: Readonly<{
        long: string;
        short: string;
        plural: string;
        singular: string;
    }>;
}>;


export type MediaDefinition<TMediaType extends MediaType = MediaType> = Readonly<{
    statuses: readonly Status[];
    statistics: MediaStatsDefinition;
    progress: MediaProgressDefinition;
    continue: ContinueDefinition<TMediaType> | (TMediaType extends typeof MediaType.MOVIES ? null : never);
    identity: Readonly<{
        mediaType: TMediaType;
    }>;
    externalSearch?: Readonly<{
        provider: ApiProviderType;
    }>;
    terminology: Readonly<{
        entry: Readonly<{
            plural: string;
            singular: string;
        }>;
    }>;
}>;


export const defineMediaDefinition = <const TDefinition extends { [T in MediaType]: MediaDefinition<T> }[MediaType]>(definition: TDefinition) => {
    return definition;
};
