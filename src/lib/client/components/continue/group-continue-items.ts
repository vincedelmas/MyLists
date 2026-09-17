import {UpdateType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";


export function groupContinueItems(items: ContinueItem[]) {
    const active: ContinueItem[] = [];
    const finished: ContinueItem[] = [];

    for (const item of items) {
        const update = getMediaDefinition(item.mediaType).continue.getUpdate(item);
        (update?.type === UpdateType.STATUS ? finished : active).push(item);
    }

    return { active, finished };
}
