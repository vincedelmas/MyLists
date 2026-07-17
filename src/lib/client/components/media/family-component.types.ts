import type {ReactNode} from "react";
import {MediaType, type Status} from "@/lib/utils/enums";
import type {ExtractFollowByType, ExtractListByType, ExtractMediaDetailsByType, ExtractUserMediaByType,} from "@/lib/types/query.options.types";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import type {UpdateUserMediaMutationOptions, UserMediaQueryOption,} from "@/lib/client/react-query/query-mutations/user-media.mutations";


export type KindDetailsProps<K extends MediaType> = {
    mediaType: K;
    media: ExtractMediaDetailsByType<K>;
};

export type KindEntryEditorProps<K extends MediaType> = {
    mediaType: K;
    queryOption: UserMediaQueryOption;
    mutationOptions?: UpdateUserMediaMutationOptions;
    userMedia: ExtractUserMediaByType<K> | ExtractListByType<K>;
};

export type KindProgressMetadata =
    | { kind: typeof MediaType.SERIES; seasons: { seasonNumber: number; episodeCount: number }[] }
    | { kind: typeof MediaType.ANIME; seasons: { seasonNumber: number; episodeCount: number }[] }
    | { kind: typeof MediaType.MOVIES }
    | { kind: typeof MediaType.GAMES }
    | { kind: typeof MediaType.BOOKS; pages: number }
    | { kind: typeof MediaType.MANGA; chapters: number | null };

export type KindFollowCardProps<K extends MediaType> = {
    rating: ReactNode;
    showComment?: boolean;
    followData: ExtractFollowByType<K>;
};

export type KindListItemProps<K extends MediaType> = {
    mediaType: K;
    rating: ReactNode;
    isCurrent: boolean;
    isConnected: boolean;
    allStatuses: Status[];
    isMediaTypeActive: boolean;
    userMedia: ExtractListByType<K>;
    queryOption: ReturnType<typeof mediaListOptions>;
};
