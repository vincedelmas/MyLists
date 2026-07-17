import {MediaType} from "@/lib/utils/enums";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvDetailsQuery} from "@/lib/server/domain/catalog/tv/tv-details.query";
import {TvCatalogReadRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-read.repository";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {TvStatsReadRepository} from "@/lib/server/domain/library/tv/tv-stats-read.repository";
import {TvCatalogAdminRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-admin.repository";
import {MovieLibraryCommands} from "@/lib/server/domain/library/movies/movie-library.commands";
import {MovieDetailsQuery} from "@/lib/server/domain/catalog/movies/movie-details.query";
import {MovieCatalogReadRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-read.repository";
import {MovieListReadRepository} from "@/lib/server/domain/library/movies/movie-list-read.repository";
import {MovieStatsReadRepository} from "@/lib/server/domain/library/movies/movie-stats-read.repository";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-admin.repository";
import {MovieCatalogEditCommand} from "@/lib/server/domain/catalog/movies/movie-catalog-edit.command";
import {GameLibraryCommands} from "@/lib/server/domain/library/games/game-library.commands";
import {GameCatalogAdminRepository} from "@/lib/server/domain/catalog/games/game-catalog-admin.repository";
import {GameCatalogEditCommand} from "@/lib/server/domain/catalog/games/game-catalog-edit.command";
import {GameDetailsQuery} from "@/lib/server/domain/catalog/games/game-details.query";
import {GameCatalogReadRepository} from "@/lib/server/domain/catalog/games/game-catalog-read.repository";
import {GameListReadRepository} from "@/lib/server/domain/library/games/game-list-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/library/games/game-stats-read.repository";
import {BookLibraryCommands} from "@/lib/server/domain/library/books/book-library.commands";
import {BookCatalogAdminRepository} from "@/lib/server/domain/catalog/books/book-catalog-admin.repository";
import {BookDetailsQuery} from "@/lib/server/domain/catalog/books/book-details.query";
import {BookListReadRepository} from "@/lib/server/domain/library/books/book-list-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/library/books/book-stats-read.repository";
import {BookCatalogReadRepository} from "@/lib/server/domain/catalog/books/book-catalog-read.repository";
import {MangaLibraryCommands} from "@/lib/server/domain/library/manga/manga-library.commands";
import {MangaCatalogAdminRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-admin.repository";
import {MangaDetailsQuery} from "@/lib/server/domain/catalog/manga/manga-details.query";
import {MangaCatalogReadRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-read.repository";
import {MangaListReadRepository} from "@/lib/server/domain/library/manga/manga-list-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/library/manga/manga-stats-read.repository";
import {UpcomingMediaCatalogRepository} from "@/lib/server/domain/notifications/upcoming-media-catalog";
import {BookCoverContributionCommand} from "@/lib/server/domain/catalog/books/book-cover-contribution.command";
import {CatalogEditCommands} from "@/lib/server/domain/catalog/catalog-edit.commands";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {LibraryCsvExportService} from "@/lib/server/domain/library/library-csv-export.service";
import {LibraryStatsRebuildService} from "@/lib/server/domain/library/library-stats-rebuild.service";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/library/movies/movie-library-read.repository";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/library/books/book-library-read.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";
import {TvCatalogEditCommand} from "@/lib/server/domain/catalog/tv/tv-catalog-edit.command";
import {BookCatalogEditCommand} from "@/lib/server/domain/catalog/books/book-catalog-edit.command";
import {MangaCatalogEditCommand} from "@/lib/server/domain/catalog/manga/manga-catalog-edit.command";


export function setupMediaModule() {
    const tvLibraryCommands = new TvLibraryCommands();
    const movieLibraryCommands = new MovieLibraryCommands();
    const gameLibraryCommands = new GameLibraryCommands();
    const bookLibraryCommands = new BookLibraryCommands();
    const mangaLibraryCommands = new MangaLibraryCommands();
    const mangaCatalogAdmin = new MangaCatalogAdminRepository();
    const mangaDetailsQuery = new MangaDetailsQuery();
    const mangaListReader = new MangaListReadRepository();
    const mangaStatsReader = new MangaStatsReadRepository();
    const bookCatalogAdmin = new BookCatalogAdminRepository();
    const bookCoverContribution = new BookCoverContributionCommand(bookCatalogAdmin);
    const bookCatalogReader = new BookCatalogReadRepository();
    const bookDetailsQuery = new BookDetailsQuery(bookCatalogReader);
    const bookListReader = new BookListReadRepository();
    const bookStatsReader = new BookStatsReadRepository();
    const gameCatalogAdmin = new GameCatalogAdminRepository();
    const gameDetailsQuery = new GameDetailsQuery();
    const gameListReader = new GameListReadRepository();
    const gameStatsReader = new GameStatsReadRepository();
    const movieDetailsQuery = new MovieDetailsQuery();
    const movieListReader = new MovieListReadRepository();
    const movieStatsReader = new MovieStatsReadRepository();
    const movieCatalogAdmin = new MovieCatalogAdminRepository();
    const movieCatalogEditor = new MovieCatalogEditCommand(movieCatalogAdmin);
    const detailsQueries = {
        [MediaType.SERIES]: new TvDetailsQuery(MediaType.SERIES),
        [MediaType.ANIME]: new TvDetailsQuery(MediaType.ANIME),
        [MediaType.MOVIES]: movieDetailsQuery,
        [MediaType.GAMES]: gameDetailsQuery,
        [MediaType.BOOKS]: bookDetailsQuery,
        [MediaType.MANGA]: mangaDetailsQuery,
    };
    const tvListReaders = {
        [MediaType.SERIES]: new TvListReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvListReadRepository(MediaType.ANIME),
    };
    const tvStatsReaders = {
        [MediaType.SERIES]: new TvStatsReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvStatsReadRepository(MediaType.ANIME),
    };
    const tvCatalogAdmin = {
        [MediaType.SERIES]: new TvCatalogAdminRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvCatalogAdminRepository(MediaType.ANIME),
    };
    const tvCatalogEditors = {
        [MediaType.SERIES]: new TvCatalogEditCommand(tvCatalogAdmin[MediaType.SERIES]),
        [MediaType.ANIME]: new TvCatalogEditCommand(tvCatalogAdmin[MediaType.ANIME]),
    };
    const catalogAdminReaders = {
        [MediaType.SERIES]: tvCatalogAdmin[MediaType.SERIES],
        [MediaType.ANIME]: tvCatalogAdmin[MediaType.ANIME],
        [MediaType.MOVIES]: movieCatalogAdmin,
        [MediaType.GAMES]: gameCatalogAdmin,
        [MediaType.BOOKS]: bookCatalogAdmin,
        [MediaType.MANGA]: mangaCatalogAdmin,
    };
    const catalogEditCommands = new CatalogEditCommands(
        tvCatalogEditors,
        movieCatalogEditor,
        new GameCatalogEditCommand(gameCatalogAdmin),
        new BookCatalogEditCommand(bookCatalogAdmin),
        new MangaCatalogEditCommand(mangaCatalogAdmin),
    );
    const catalogRefreshCandidates = new CatalogRefreshCandidateRepository();
    const upcomingMediaCatalog = new UpcomingMediaCatalogRepository(tvListReaders, movieListReader, gameListReader);
    const libraryCommands = {
        [MediaType.SERIES]: tvLibraryCommands,
        [MediaType.ANIME]: tvLibraryCommands,
        [MediaType.MOVIES]: movieLibraryCommands,
        [MediaType.GAMES]: gameLibraryCommands,
        [MediaType.BOOKS]: bookLibraryCommands,
        [MediaType.MANGA]: mangaLibraryCommands,
    };
    const libraryReaders = {
        [MediaType.SERIES]: new TvLibraryReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvLibraryReadRepository(MediaType.ANIME),
        [MediaType.MOVIES]: new MovieLibraryReadRepository(),
        [MediaType.GAMES]: new GameLibraryReadRepository(),
        [MediaType.BOOKS]: new BookLibraryReadRepository(),
        [MediaType.MANGA]: new MangaLibraryReadRepository(),
    };
    const catalogReaders = {
        [MediaType.SERIES]: new TvCatalogReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvCatalogReadRepository(MediaType.ANIME),
        [MediaType.MOVIES]: new MovieCatalogReadRepository(),
        [MediaType.GAMES]: new GameCatalogReadRepository(),
        [MediaType.BOOKS]: bookCatalogReader,
        [MediaType.MANGA]: new MangaCatalogReadRepository(),
    };

    return {
        library: {
            commands: libraryCommands,
            readers: libraryReaders,
            csvExport: new LibraryCsvExportService(),
            statsRebuilder: new LibraryStatsRebuildService(),
        },
        media: {
            details: { queries: detailsQueries },
            lists: {
                tv: tvListReaders,
                movies: movieListReader,
                games: gameListReader,
                books: bookListReader,
                manga: mangaListReader,
            },
            stats: {
                tv: tvStatsReaders,
                movies: movieStatsReader,
                games: gameStatsReader,
                books: bookStatsReader,
                manga: mangaStatsReader,
            },
            catalog: {
                readers: catalogReaders,
                adminReaders: catalogAdminReaders,
                edit: catalogEditCommands,
                refreshCandidates: catalogRefreshCandidates,
                bookCover: bookCoverContribution,
                maintenance: {
                    books: bookCatalogAdmin,
                    games: gameCatalogAdmin,
                    movies: movieCatalogAdmin,
                },
            },
            upcoming: upcomingMediaCatalog,
        },
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
