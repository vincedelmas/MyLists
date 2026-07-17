import type {ReactNode} from "react";
import {MediaType, type Status} from "@/lib/utils/enums";
import type {
    ExtractFollowByType,
    ExtractListByType,
    ExtractMediaDetailsByType,
    ExtractUserMediaByType,
} from "@/lib/types/query.options.types";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import type {
    UpdateUserMediaMutationOptions,
    UserMediaQueryOption,
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


export type FamilyDetailsProps<K extends MediaType> = {
    mediaType: K;
    media: ExtractMediaDetailsByType<K>;
};

export type FamilyEntryEditorProps<K extends MediaType> = {
    mediaType: K;
    queryOption: UserMediaQueryOption;
    userMedia: ExtractUserMediaByType<K> | ExtractListByType<K>;
    mutationOptions?: UpdateUserMediaMutationOptions;
};

export type FamilyProgressMetadata =
    | { kind: typeof MediaType.SERIES; seasons: { seasonNumber: number; episodeCount: number }[] }
    | { kind: typeof MediaType.ANIME; seasons: { seasonNumber: number; episodeCount: number }[] }
    | { kind: typeof MediaType.MOVIES }
    | { kind: typeof MediaType.GAMES }
    | { kind: typeof MediaType.BOOKS; pages: number }
    | { kind: typeof MediaType.MANGA; chapters: number | null };

export type FamilyFollowCardProps<K extends MediaType> = {
    showComment?: boolean;
    rating: ReactNode;
    followData: ExtractFollowByType<K>;
};

export type FamilyListItemProps<K extends MediaType> = {
    mediaType: K;
    isCurrent: boolean;
    isConnected: boolean;
    isMediaTypeActive: boolean;
    allStatuses: Status[];
    rating: ReactNode;
    userMedia: ExtractListByType<K>;
    queryOption: ReturnType<typeof mediaListOptions>;
};
