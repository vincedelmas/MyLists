import {ApiProviderType} from "@/lib/utils/enums";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {AdvancedSearchFilterDefinition} from "@/lib/types/advanced-search.types";
import {bookSearchFilterDefinition} from "@/lib/client/components/search/BookSearchFilters";
import {gameSearchFilterDefinition} from "@/lib/client/components/search/GameSearchFilters";


const searchFilterDefinitions: Partial<Record<ApiProviderType, AdvancedSearchFilterDefinition>> = {
    [booksDefinition.externalSearch.provider]: bookSearchFilterDefinition,
    [gamesDefinition.externalSearch.provider]: gameSearchFilterDefinition,
};


export const getSearchFilterDefinition = (provider: ApiProviderType) => {
    return searchFilterDefinitions[provider];
};
