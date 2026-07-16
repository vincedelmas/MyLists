import {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";


export type MangaStatus =
    | typeof Status.READING
    | typeof Status.COMPLETED
    | typeof Status.ON_HOLD
    | typeof Status.DROPPED
    | typeof Status.PLAN_TO_READ;


export type MangaProgressState = {
    status: MangaStatus;
    currentChapter: number;
    rereadCount: number;
    totalChaptersRead: number;
};


const MANGA_STATUSES = new Set<Status>([
    Status.READING,
    Status.COMPLETED,
    Status.ON_HOLD,
    Status.DROPPED,
    Status.PLAN_TO_READ,
]);


export const isMangaStatus = (status: Status): status is MangaStatus => MANGA_STATUSES.has(status);


export const createInitialMangaProgress = (status: Status, chapters: number | null): MangaProgressState => {
    const nextStatus = requireMangaStatus(status);
    if (nextStatus === Status.COMPLETED) {
        const knownChapters = requireKnownChapters(chapters);
        return { status: nextStatus, currentChapter: knownChapters, rereadCount: 0, totalChaptersRead: knownChapters };
    }
    return { status: nextStatus, currentChapter: 0, rereadCount: 0, totalChaptersRead: 0 };
};


export const changeMangaStatus = (
    current: MangaProgressState,
    status: Status,
    chapters: number | null,
): MangaProgressState => {
    const nextStatus = requireMangaStatus(status);
    if (nextStatus === Status.COMPLETED) {
        const knownChapters = requireKnownChapters(chapters);
        return { ...current, status: nextStatus, currentChapter: knownChapters, totalChaptersRead: knownChapters };
    }
    if (nextStatus === Status.PLAN_TO_READ) {
        return { status: nextStatus, currentChapter: 0, rereadCount: 0, totalChaptersRead: 0 };
    }
    return { ...current, status: nextStatus };
};


export const replaceMangaChapter = (
    current: MangaProgressState,
    currentChapter: number,
    chapters: number | null,
): MangaProgressState => {
    assertProgress(currentChapter, "Chapter");
    return {
        ...current,
        currentChapter,
        totalChaptersRead: currentChapter + current.rereadCount * (chapters ?? 0),
    };
};


export const replaceMangaRereads = (
    current: MangaProgressState,
    rereadCount: number,
    chapters: number | null,
): MangaProgressState => {
    assertReread(rereadCount);
    const knownChapters = requireKnownChapters(chapters);
    return {
        ...current,
        rereadCount,
        totalChaptersRead: knownChapters + rereadCount * knownChapters,
    };
};


export const importMangaProgress = (
    status: Status,
    currentChapter: number,
    rereadCount: number,
    totalChaptersRead: number,
): MangaProgressState => {
    const nextStatus = requireMangaStatus(status);
    assertProgress(currentChapter, "Chapter");
    assertReread(rereadCount);
    assertProgress(totalChaptersRead, "Total chapters");
    return { status: nextStatus, currentChapter, rereadCount, totalChaptersRead };
};


const requireMangaStatus = (status: Status): MangaStatus => {
    if (!isMangaStatus(status)) throw new FormattedError("Invalid status for manga.");
    return status;
};


const requireKnownChapters = (chapters: number | null) => {
    if (!chapters) throw new FormattedError("Cannot complete or redo a manga without chapters");
    return chapters;
};


const assertProgress = (value: number, field: string) => {
    if (!Number.isInteger(value) || value < 0 || value > PROGRESS_MAX) {
        throw new FormattedError(`${field} must be between 0 and ${PROGRESS_MAX}.`);
    }
};


const assertReread = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > REDO_MAX) {
        throw new FormattedError(`Reread count must be between 0 and ${REDO_MAX}.`);
    }
};
