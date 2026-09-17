import {MediaType, UpdateType} from "@/lib/utils/enums";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getBooksContinueProgress(item: ContinueItemFor<typeof MediaType.BOOKS>): ContinueProgress {
    const value = item.actualPage ?? 0;
    const update = booksDefinition.continue.getUpdate(item);
    const nextPage = update?.type === UpdateType.PAGE ? update.actualPage : value;

    return {
        value,
        total: item.pages || null,
        label: `${value} / ${item.pages || "?"} pages`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : nextPage > value
            ? `+ ${nextPage - value} ${nextPage - value === 1 ? "page" : "pages"}`
            : item.pages ? "Progress limit reached" : "Page count unknown",
        update: update ? { payload: update } : null,
    };
}
