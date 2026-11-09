import type {MediaType} from "@/lib/utils/enums";
import type {UpdatePayload} from "@/lib/types/user-media.types";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export type ContinueItemFor<T extends MediaType> = ContinueItemsByType[T];
type ContinueItemsByType = { [T in MediaType]: Extract<ContinueItem, { mediaType: T }> };


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


export const formatContinueProgress = (position: string, remainingMinutes: number | null) => {
    if (remainingMinutes === null || remainingMinutes <= 0) return position;

    const estimate = remainingMinutes < 60
        ? "< 1h"
        : `~ ${Math.round(remainingMinutes / 60)}h`;

    return `${position} · ${estimate} left`;
};
