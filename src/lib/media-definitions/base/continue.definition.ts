import type {Status, UpdateType} from "@/lib/utils/enums";
import type {ChapterPayload, EpsSeasonPayload, PagePayload, PlaytimePayload} from "@/lib/types/user-media.types";


type ContinueUpdate =
    | ({ type: typeof UpdateType.TV } & EpsSeasonPayload)
    | ({ type: typeof UpdateType.PAGE } & PagePayload)
    | ({ type: typeof UpdateType.CHAPTER } & ChapterPayload)
    | ({ type: typeof UpdateType.PLAYTIME } & PlaytimePayload)
    | { type: typeof UpdateType.STATUS; status: typeof Status.COMPLETED };


export type ContinueDefinition<TState> = {
    getUpdate: (state: TState) => ContinueUpdate | null;
};
