import {MediaType, UpdateType} from "@/lib/utils/enums";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";
import {formatContinueProgress} from "@/lib/client/components/continue/format-remaining";


export function getBooksContinueProgress(item: ContinueItemFor<typeof MediaType.BOOKS>): ContinueProgress {
    const value = item.actualPage ?? 0;
    const update = booksDefinition.continue.getUpdate(item);
    const nextPage = update?.type === UpdateType.PAGE ? update.actualPage : value;

    const remaining = Math.max(0, (item.pages ?? 0) - value);

    return {
        value,
        label: formatContinueProgress(
            `${value}/${item.pages || "?"} pp`,
            item.pages ? remaining * booksDefinition.progress.timing.minutesPerUnit : null,
        ),
        total: item.pages || null,
        update: update ? { payload: update } : null,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : nextPage > value
            ? `+ ${nextPage - value} ${nextPage - value === 1 ? "page" : "pages"}`
            : item.pages ? "Progress limit reached" : "Page count unknown",
    };
}
