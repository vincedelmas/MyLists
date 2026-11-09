import {useState} from "react";
import {UpdateType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export const useContinueOrder = (items: ContinueItem[]) => {
    const [order, setOrder] = useState(() => items.map(toItemKey));

    const positions = new Map(order.map((key, index) => [key, index]));
    const added = items.map(toItemKey).filter(key => !positions.has(key));

    if (added.length > 0) setOrder([...order, ...added]);

    return [...items].sort((a, b) => (positions.get(toItemKey(a)) ?? order.length) - (positions.get(toItemKey(b)) ?? order.length)
    );
};


export const groupContinueItems = (items: ContinueItem[]) => {
    const active: ContinueItem[] = [];
    const finished: ContinueItem[] = [];

    for (const item of items) {
        const update = getMediaDefinition(item.mediaType).continue.getUpdate(item);
        (update?.type === UpdateType.STATUS ? finished : active).push(item);
    }

    return { active, finished };
};
