import {useState} from "react";
import {toItemKey} from "@/lib/utils/media/item-key";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export const useContinueOrder = (items: ContinueItem[], scope?: string) => {
    const [order, setOrder] = useState(() => ({ scope, keys: items.map(toItemKey) }));

    // Adopt server ordering on navigation/filter changes, not during quick updates.
    if (order.scope !== scope) {
        setOrder({ scope, keys: items.map(toItemKey) });
        return items;
    }

    const positions = new Map(order.keys.map((key, index) => [key, index]));
    const added = items.map(toItemKey).filter(key => !positions.has(key));

    if (added.length > 0) setOrder({ scope, keys: [...order.keys, ...added] });

    return [...items].sort((a, b) =>
        (positions.get(toItemKey(a)) ?? order.keys.length) - (positions.get(toItemKey(b)) ?? order.keys.length)
    );
};
