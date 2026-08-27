import type {LucideIcon} from "lucide-react";
import type {ComponentType, ReactNode} from "react";
import type {ColumnDef} from "@tanstack/react-table";
import type {MediaStatsFor} from "@/lib/types/stats.types";
import type {SheetFilterObject} from "@/lib/types/media-list.types";
import type {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import type {MediaCommunityActivityStats} from "@/lib/types/user-media.types";
import type {AdvancedSearchFilterDefinition} from "@/lib/types/advanced-search.types";
import type {ColumnConfigProps} from "@/lib/client/components/media/base/BaseListTable";
import type {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import type {UpdateUserMediaMutationOptions, UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import type {ExtractFollowByType, ExtractListByType, ExtractMediaDetailsByType, ExtractUserMediaByType} from "@/lib/types/query.options.types";


export interface MediaDetailsProps<T extends MediaType> {
    mediaType: T;
    media: ExtractMediaDetailsByType<T>;
}


export interface MediaUserDetailsProps<T extends MediaType> {
    mediaType: T;
    queryOption: UserMediaQueryOption;
    userMedia: ExtractUserMediaByType<T>;
    mutationOptions?: UpdateUserMediaMutationOptions;
}


export interface MediaFollowCardProps<T extends MediaType> {
    rating: ReactNode;
    showComment?: boolean;
    followData: ExtractFollowByType<T>;
}


export interface MediaListCardProps<T extends MediaType> {
    mediaType: T;
    rating: ReactNode;
    isCurrent: boolean;
    isConnected: boolean;
    allStatuses: Status[];
    isMediaTypeActive: boolean;
    userMedia: ExtractListByType<T>;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export interface AdvancedSearchConfig extends AdvancedSearchFilterDefinition {
    provider: ApiProviderType;
}


export interface MediaStatCardDefinition {
    title: string;
    icon?: LucideIcon;
    subtitle?: string;
    value: ReactNode;
}


export interface MediaClientConfig<T extends MediaType> {
    mediaType: T;
    advancedSearch?: AdvancedSearchConfig;
    sheetFilters: () => SheetFilterObject[];
    infoGrid: ComponentType<MediaDetailsProps<T>>;
    overTitle: ComponentType<MediaDetailsProps<T>>;
    underTitle: ComponentType<MediaDetailsProps<T>>;
    mediaListCard: ComponentType<MediaListCardProps<T>>;
    upComingAlert?: ComponentType<MediaDetailsProps<T>>;
    extraSections?: ComponentType<MediaDetailsProps<T>>;
    mediaFollowCard: ComponentType<MediaFollowCardProps<T>>;
    mediaUserDetails: ComponentType<MediaUserDetailsProps<T>>;
    mediaListColumns: (props: ColumnConfigProps) => ColumnDef<typeof mediaTableFeatures, ExtractListByType<T>>[];
    communityActivity: {
        countLabel: string;
        extraLabel: string;
        extraMetric: keyof Pick<MediaCommunityActivityStats, "totalRedo" | "totalPlaytime" | "totalSpecific">;
    };
    statistics: {
        getStatCards: (stats: MediaStatsFor<T>) => MediaStatCardDefinition[];
    };
}


export type MediaConfigRegistry = {
    [T in MediaType]: MediaClientConfig<T>;
};


export const defineMediaConfig = <T extends MediaType>(config: MediaClientConfig<T>) => {
    return config;
}
