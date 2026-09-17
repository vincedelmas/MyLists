import type {EpsPerSeasonType} from "@/lib/types/media-list.types";
import type {MediaType, Status, TvMediaType, UpdateType} from "@/lib/utils/enums";
import type {ChapterPayload, EpsSeasonPayload, PagePayload, PlaytimePayload} from "@/lib/types/user-media.types";


type TvProgress = {
    currentSeason: number;
    currentEpisode: number;
    epsPerSeason: EpsPerSeasonType[];
};


export type ContinueStateByType = {
    [T in TvMediaType]: TvProgress;
} & {
    [MediaType.MOVIES]: never;
    [MediaType.BOOKS]: { actualPage: number | null; pages: number };
    [MediaType.MANGA]: { currentChapter: number; chapters: number | null };
    [MediaType.GAMES]: { playtime: number | null };
};


type ContinueUpdate =
    | ({ type: typeof UpdateType.TV } & EpsSeasonPayload)
    | ({ type: typeof UpdateType.PAGE } & PagePayload)
    | ({ type: typeof UpdateType.CHAPTER } & ChapterPayload)
    | ({ type: typeof UpdateType.PLAYTIME } & PlaytimePayload)
    | { type: typeof UpdateType.STATUS; status: typeof Status.COMPLETED };


export type ContinueDefinition<T extends MediaType> = {
    status: Status;
    getUpdate: (state: ContinueStateByType[T]) => ContinueUpdate | null;
};
