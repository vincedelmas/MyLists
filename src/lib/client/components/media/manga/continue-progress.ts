import {MediaType, UpdateType} from "@/lib/utils/enums";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getMangaContinueProgress(item: ContinueItemFor<typeof MediaType.MANGA>): ContinueProgress {
    const value = item.currentChapter;
    const update = mangaDefinition.continue.getUpdate(item);

    return {
        value,
        total: item.chapters || null,
        label: `${value} / ${item.chapters || "?"} chapters`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 chapter" : "Progress limit reached",
        update: update ? { payload: update } : null,
    };
}
