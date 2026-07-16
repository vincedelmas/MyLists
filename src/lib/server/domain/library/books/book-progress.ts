import {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";


const BOOK_REREAD_MAX = 100;
const BOOK_PROGRESS_MAX = 10_000_000;


export type BookStatus =
    | typeof Status.READING
    | typeof Status.COMPLETED
    | typeof Status.ON_HOLD
    | typeof Status.DROPPED
    | typeof Status.PLAN_TO_READ;


export type BookProgressState = {
    status: BookStatus;
    currentPage: number | null;
    rereadCount: number;
    totalPagesRead: number;
};


const bookStatuses = new Set<Status>([
    Status.READING,
    Status.COMPLETED,
    Status.ON_HOLD,
    Status.DROPPED,
    Status.PLAN_TO_READ,
]);


export const isBookStatus = (status: Status): status is BookStatus => bookStatuses.has(status);


export const createInitialBookProgress = (status: Status, pages: number): BookProgressState => {
    const nextStatus = requireBookStatus(status);
    const pageCount = requireCatalogPages(pages);
    const completed = nextStatus === Status.COMPLETED;
    return {
        status: nextStatus,
        currentPage: completed ? pageCount : 0,
        rereadCount: 0,
        totalPagesRead: completed ? pageCount : 0,
    };
};


/** Imports preserve explicit historical totals even when later catalog metadata no longer derives them. */
export const importBookProgress = (
    status: Status,
    currentPage: number | null,
    rereadCount: number,
    totalPagesRead: number,
): BookProgressState => ({
    status: requireBookStatus(status),
    currentPage: currentPage === null ? null : requireProgress(currentPage, "Current page"),
    rereadCount: requireRereadCount(rereadCount),
    totalPagesRead: requireProgress(totalPagesRead, "Total pages read"),
});


export const changeBookStatus = (current: BookProgressState, status: Status, pages: number): BookProgressState => {
    const nextStatus = requireBookStatus(status);
    const pageCount = requireCatalogPages(pages);
    if (nextStatus === Status.COMPLETED) {
        return { ...current, status: nextStatus, currentPage: pageCount, totalPagesRead: pageCount };
    }
    if (nextStatus === Status.PLAN_TO_READ) {
        return { status: nextStatus, currentPage: 0, rereadCount: 0, totalPagesRead: 0 };
    }
    return { ...current, status: nextStatus };
};


export const replaceBookPage = (current: BookProgressState, currentPage: number, pages: number): BookProgressState => {
    const page = requireProgress(currentPage, "Current page");
    const pageCount = requireCatalogPages(pages);
    if (page > pageCount) throw new FormattedError("Invalid page");
    return {
        ...current,
        currentPage: page,
        totalPagesRead: page + (current.rereadCount * pageCount),
    };
};


export const replaceBookRereads = (current: BookProgressState, rereadCount: number, pages: number): BookProgressState => {
    const count = requireRereadCount(rereadCount);
    const pageCount = requireCatalogPages(pages);
    return {
        ...current,
        rereadCount: count,
        totalPagesRead: pageCount + (count * pageCount),
    };
};


const requireBookStatus = (status: Status): BookStatus => {
    if (!isBookStatus(status)) throw new FormattedError("Status is not valid for books.");
    return status;
};


const requireCatalogPages = (pages: number) => {
    if (!Number.isInteger(pages) || pages < 0 || pages > BOOK_PROGRESS_MAX) {
        throw new FormattedError("Book page count is invalid.");
    }
    return pages;
};


const requireProgress = (value: number, label: string) => {
    if (!Number.isInteger(value) || value < 0 || value > BOOK_PROGRESS_MAX) {
        throw new FormattedError(`${label} must be between 0 and ${BOOK_PROGRESS_MAX}.`);
    }
    return value;
};


const requireRereadCount = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > BOOK_REREAD_MAX) {
        throw new FormattedError(`A book cannot be re-read more than ${BOOK_REREAD_MAX} times.`);
    }
    return value;
};
