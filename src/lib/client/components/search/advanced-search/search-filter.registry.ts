import {ApiProviderType} from "@/lib/utils/enums";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {bookSearchFilterDefinition} from "@/lib/client/components/search/advanced-search/BookSearchFilters";
import {gameSearchFilterDefinition} from "@/lib/client/components/search/advanced-search/GameSearchFilters";
import {AdvancedSearchFilterDefinition} from "@/lib/types/advanced-search.types";


const searchFilterDefinitions: Partial<Record<ApiProviderType, AdvancedSearchFilterDefinition>> = {
    [booksDefinition.externalSearch.provider]: bookSearchFilterDefinition,
    [gamesDefinition.externalSearch.provider]: gameSearchFilterDefinition,
};


export const getSearchFilterDefinition = (provider: ApiProviderType) => {
    return searchFilterDefinitions[provider];
};
