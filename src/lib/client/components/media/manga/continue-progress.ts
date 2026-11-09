import {MediaType, UpdateType} from "@/lib/utils/enums";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {formatContinueProgress, type ContinueItemFor, type ContinueProgress} from "@/lib/client/components/continue/continue.utils";


export function getMangaContinueProgress(item: ContinueItemFor<typeof MediaType.MANGA>): ContinueProgress {
    const value = item.currentChapter;
    const update = mangaDefinition.continue.getUpdate(item);

    const remaining = Math.max(0, (item.chapters ?? 0) - value);

    return {
        value,
        total: item.chapters || null,
        update: update ? { payload: update } : null,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 chapter" : "Progress limit reached",
        label: formatContinueProgress(
            `${value}/${item.chapters || "?"} ch`,
            item.chapters ? remaining * mangaDefinition.progress.timing.minutesPerUnit : null,
        ),
    };
}
