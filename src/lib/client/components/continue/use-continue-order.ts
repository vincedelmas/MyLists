import {useState} from "react";
import {toItemKey} from "@/lib/utils/media/item-key";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export function useContinueOrder(items: ContinueItem[]) {
    const [order, setOrder] = useState(() => items.map(toItemKey));

    const positions = new Map(order.map((key, index) => [key, index]));
    const added = items.map(toItemKey).filter(key => !positions.has(key));

    if (added.length > 0) setOrder([...order, ...added]);

    return [...items].sort((a, b) => (positions.get(toItemKey(a)) ?? order.length) - (positions.get(toItemKey(b)) ?? order.length)
    );
}
