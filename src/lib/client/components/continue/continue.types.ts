import type {MediaType} from "@/lib/utils/enums";
import type {ContinueProgress} from "@/lib/utils/media/continue";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


type ContinueItemsByType = {
    [T in MediaType]: Extract<ContinueItem, { mediaType: T }>;
};

export type ContinueItemFor<T extends MediaType> = ContinueItemsByType[T];

export type ContinueConfig<T extends MediaType> = {
    getProgress: (item: ContinueItemFor<T>) => ContinueProgress;
};
