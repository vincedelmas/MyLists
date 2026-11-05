import type {MediaType} from "@/lib/utils/enums";
import type {UpdatePayload} from "@/lib/types/user-media.types";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


type ContinueItemsByType = {
    [T in MediaType]: Extract<ContinueItem, { mediaType: T }>;
};


export type ContinueItemFor<T extends MediaType> = ContinueItemsByType[T];


export type ContinueProgress = {
    value: number;
    label: string;
    actionLabel: string;
    total: number | null;
    update: UpdatePayload | null;
};


export type ContinueConfig<T extends MediaType> = {
    getProgress: (item: ContinueItemFor<T>) => ContinueProgress;
};
