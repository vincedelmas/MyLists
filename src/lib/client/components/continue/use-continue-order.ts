import {useState} from "react";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export function useContinueOrder(items: ContinueItem[]) {
    const [order, setOrder] = useState(() => items.map(item => `${item.mediaType}-${item.mediaId}`));

    const positions = new Map(order.map((key, index) => [key, index]));
    const added = items.map(item => `${item.mediaType}-${item.mediaId}`).filter(key => !positions.has(key));

    if (added.length > 0) setOrder([...order, ...added]);

    return [...items].sort((a, b) =>
        (positions.get(`${a.mediaType}-${a.mediaId}`) ?? order.length)
        - (positions.get(`${b.mediaType}-${b.mediaId}`) ?? order.length)
    );
}
