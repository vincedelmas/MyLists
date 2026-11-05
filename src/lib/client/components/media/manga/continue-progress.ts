import {MediaType, UpdateType} from "@/lib/utils/enums";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {formatContinueProgress} from "@/lib/client/components/continue/format-remaining";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getMangaContinueProgress(item: ContinueItemFor<typeof MediaType.MANGA>): ContinueProgress {
    const value = item.currentChapter;
    const update = mangaDefinition.continue.getUpdate(item);

    const remaining = Math.max(0, (item.chapters ?? 0) - value);

    return {
        value,
        label: formatContinueProgress(
            `${value}/${item.chapters || "?"} ch`,
            item.chapters ? remaining * mangaDefinition.progress.timing.minutesPerUnit : null,
        ),
        total: item.chapters || null,
        update: update ? { payload: update } : null,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 chapter" : "Progress limit reached",
    };
}
