import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {booksMediaConfig} from "@/lib/client/components/media/books/books.media-config";
import {gamesMediaConfig} from "@/lib/client/components/media/games/games.media-config";
import {mangaMediaConfig} from "@/lib/client/components/media/manga/manga.media-config";
import {moviesMediaConfig} from "@/lib/client/components/media/movies/movies.media-config";
import {animeMediaConfig, seriesMediaConfig} from "@/lib/client/components/media/tv/tv.media-config";
import {AdvancedSearchConfig, MediaClientConfig, MediaConfigRegistry} from "@/lib/client/components/media/media-config.types";


export const mediaConfig: MediaConfigRegistry = {
    [MediaType.SERIES]: seriesMediaConfig,
    [MediaType.ANIME]: animeMediaConfig,
    [MediaType.MOVIES]: moviesMediaConfig,
    [MediaType.GAMES]: gamesMediaConfig,
    [MediaType.BOOKS]: booksMediaConfig,
    [MediaType.MANGA]: mangaMediaConfig,
};


const mediaConfigValues = Object.values(mediaConfig);


export const getMediaConfig = <T extends MediaType>(mediaType: T): MediaClientConfig<T> => {
    return mediaConfig[mediaType];
};


export const getAdvancedSearchConfig = (provider: ApiProviderType): AdvancedSearchConfig | undefined => {
    return mediaConfigValues.find((config) => config.advancedSearch?.provider === provider)?.advancedSearch;
};
