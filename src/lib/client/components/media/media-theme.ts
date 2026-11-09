import type {MediaType} from "@/lib/utils/enums";
import {booksTheme} from "@/lib/client/components/media/books/books.theme";
import {gamesTheme} from "@/lib/client/components/media/games/games.theme";
import {mangaTheme} from "@/lib/client/components/media/manga/manga.theme";
import {moviesTheme} from "@/lib/client/components/media/movies/movies.theme";
import {animeTheme, seriesTheme} from "@/lib/client/components/media/tv/tv.theme";


// Keep themes independent of component configs: shared UI also needs these icons
const themes = [seriesTheme, animeTheme, moviesTheme, gamesTheme, booksTheme, mangaTheme] as const;


const mediaThemes = Object.fromEntries(themes.map(theme => [theme.mediaType, theme])) as {
    [Theme in typeof themes[number] as Theme["mediaType"]]: Theme;
};


export const getMediaTheme = (mediaType: MediaType) => {
    return mediaThemes[mediaType];
}


export const MEDIA_THEME_COLORS = Object.fromEntries(themes.map(({ mediaType }) => {
    return [mediaType, `var(--${mediaType})`];
})) as Record<MediaType, string>;
