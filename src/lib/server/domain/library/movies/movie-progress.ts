import {FormattedError} from "@/lib/utils/error-classes";
import {Status} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";


type MovieStatus = typeof Status.COMPLETED | typeof Status.PLAN_TO_WATCH;


export type MovieProgressState = {
    status: MovieStatus;
    watchCount: number;
};


export const createInitialMovieProgress = (status: Status): MovieProgressState => {
    const validStatus = requireMovieStatus(status);
    return {
        status: validStatus,
        watchCount: validStatus === Status.COMPLETED ? 1 : 0,
    };
};


export const changeMovieStatus = (_current: MovieProgressState, status: Status): MovieProgressState =>
    createInitialMovieProgress(status);


export const replaceMovieRewatches = (current: MovieProgressState, rewatchCount: number): MovieProgressState => {
    if (current.status !== Status.COMPLETED) {
        throw new FormattedError("A planned movie cannot have rewatches.");
    }
    if (!Number.isInteger(rewatchCount) || rewatchCount < 0 || rewatchCount > REDO_MAX) {
        throw new FormattedError(`A movie cannot be re-watched more than ${REDO_MAX} times.`);
    }
    return { ...current, watchCount: rewatchCount + 1 };
};


export const importMovieProgress = (status: Status, rewatchCount: number): MovieProgressState => {
    const initial = createInitialMovieProgress(status);
    return initial.status === Status.COMPLETED ? replaceMovieRewatches(initial, rewatchCount) : initial;
};


export const movieRedoCount = (state: MovieProgressState) => Math.max(0, state.watchCount - 1);


const requireMovieStatus = (status: Status): MovieStatus => {
    if (status !== Status.COMPLETED && status !== Status.PLAN_TO_WATCH) {
        throw new FormattedError("Status is not valid for movies.");
    }
    return status;
};
