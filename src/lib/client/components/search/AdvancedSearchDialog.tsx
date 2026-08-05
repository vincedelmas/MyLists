import type {ComponentType} from "react";
import {ApiProviderType} from "@/lib/utils/enums";
import {supportsAdvancedSearch} from "@/lib/media-definitions/definition.registry";
import {BookAdvancedSearchDialog} from "@/lib/client/components/search/advanced-search/BookAdvancedSearchDialog";
import {GameAdvancedSearchDialog} from "@/lib/client/components/search/advanced-search/GameAdvancedSearchDialog";
import {TmdbAdvancedSearchDialog} from "@/lib/client/components/search/advanced-search/TmdbAdvancedSearchDialog";
import type {AdvancedSearchDialogProps, ProviderAdvancedSearchDialogProps} from "@/lib/client/components/search/advanced-search/advanced-search.types";


const advancedSearchDialogsMap: Partial<Record<ApiProviderType, ComponentType<ProviderAdvancedSearchDialogProps>>> = {
    [ApiProviderType.IGDB]: GameAdvancedSearchDialog,
    [ApiProviderType.TMDB]: TmdbAdvancedSearchDialog,
    [ApiProviderType.BOOKS]: BookAdvancedSearchDialog,
};


export const AdvancedSearchDialog = ({ provider, ...props }: AdvancedSearchDialogProps) => {
    const ProviderDialog = advancedSearchDialogsMap[provider];
    if (!ProviderDialog || !supportsAdvancedSearch(provider)) return null;

    return <ProviderDialog {...props}/>;
};
