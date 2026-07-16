import {MediaType} from "@/lib/utils/enums";
import {TvLibraryWriter} from "@/lib/server/domain/library/tv/tv-library.writer";
import {TvDetailsReadService} from "@/lib/server/domain/catalog/tv/tv-details-read.service";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {TvActivityReadRepository} from "@/lib/server/domain/library/tv/tv-activity-read.repository";
import {TvStatsReadRepository} from "@/lib/server/domain/library/tv/tv-stats-read.repository";
import {TvCatalogAdminRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-admin.repository";
import {MovieLibraryWriter} from "@/lib/server/domain/library/movies/movie-library.writer";
import {MovieDetailsReadService} from "@/lib/server/domain/catalog/movies/movie-details-read.service";
import {MovieListReadRepository} from "@/lib/server/domain/library/movies/movie-list-read.repository";
import {MovieActivityReadRepository} from "@/lib/server/domain/library/movies/movie-activity-read.repository";
import {MovieStatsReadRepository} from "@/lib/server/domain/library/movies/movie-stats-read.repository";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-admin.repository";
import {GameLibraryWriter} from "@/lib/server/domain/library/games/game-library.writer";
import {GameCatalogAdminRepository} from "@/lib/server/domain/catalog/games/game-catalog-admin.repository";
import {GameDetailsReadService} from "@/lib/server/domain/catalog/games/game-details-read.service";
import {GameListReadRepository} from "@/lib/server/domain/library/games/game-list-read.repository";
import {GameActivityReadRepository} from "@/lib/server/domain/library/games/game-activity-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/library/games/game-stats-read.repository";
import {BookLibraryWriter} from "@/lib/server/domain/library/books/book-library.writer";
import {BookCatalogAdminRepository} from "@/lib/server/domain/catalog/books/book-catalog-admin.repository";
import {BookDetailsReadService} from "@/lib/server/domain/catalog/books/book-details-read.service";
import {BookListReadRepository} from "@/lib/server/domain/library/books/book-list-read.repository";
import {BookActivityReadRepository} from "@/lib/server/domain/library/books/book-activity-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/library/books/book-stats-read.repository";
import {BookCatalogReadRepository} from "@/lib/server/domain/catalog/books/book-catalog-read.repository";
import {MangaLibraryWriter} from "@/lib/server/domain/library/manga/manga-library.writer";
import {MangaCatalogAdminRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-admin.repository";
import {MangaDetailsReadService} from "@/lib/server/domain/catalog/manga/manga-details-read.service";
import {MangaListReadRepository} from "@/lib/server/domain/library/manga/manga-list-read.repository";
import {MangaActivityReadRepository} from "@/lib/server/domain/library/manga/manga-activity-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/library/manga/manga-stats-read.repository";
import {UpcomingMediaCatalogRepository} from "@/lib/server/domain/notifications/upcoming-media-catalog";
import {BookCoverContributionService} from "@/lib/server/domain/catalog/books/book-cover-contribution.service";
import {CatalogManagerEditService} from "@/lib/server/domain/catalog/catalog-manager-edit.service";
import {LibraryCommandService} from "@/lib/server/domain/library/library-command.service";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/library/movies/movie-library-read.repository";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/library/books/book-library-read.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {LibraryCsvExportService} from "@/lib/server/domain/library/library-csv-export.service";
import {LibraryStatsRebuildService} from "@/lib/server/domain/library/library-stats-rebuild.service";


export function setupMediaModule() {
    const tvLibraryWriter = new TvLibraryWriter();
    const movieLibraryWriter = new MovieLibraryWriter();
    const gameLibraryWriter = new GameLibraryWriter();
    const bookLibraryWriter = new BookLibraryWriter();
    const mangaLibraryWriter = new MangaLibraryWriter();
    const mangaCatalogAdmin = new MangaCatalogAdminRepository();
    const mangaDetailsReader = new MangaDetailsReadService();
    const mangaListReader = new MangaListReadRepository();
    const mangaActivityReader = new MangaActivityReadRepository();
    const mangaStatsReader = new MangaStatsReadRepository();
    const bookCatalogAdmin = new BookCatalogAdminRepository();
    const bookCoverContribution = new BookCoverContributionService(bookCatalogAdmin);
    const bookCatalogReader = new BookCatalogReadRepository();
    const bookDetailsReader = new BookDetailsReadService(bookCatalogReader);
    const bookListReader = new BookListReadRepository();
    const bookActivityReader = new BookActivityReadRepository();
    const bookStatsReader = new BookStatsReadRepository();
    const gameCatalogAdmin = new GameCatalogAdminRepository();
    const gameDetailsReader = new GameDetailsReadService();
    const gameListReader = new GameListReadRepository();
    const gameActivityReader = new GameActivityReadRepository();
    const gameStatsReader = new GameStatsReadRepository();
    const movieDetailsReader = new MovieDetailsReadService();
    const movieListReader = new MovieListReadRepository();
    const movieActivityReader = new MovieActivityReadRepository();
    const movieStatsReader = new MovieStatsReadRepository();
    const movieCatalogAdmin = new MovieCatalogAdminRepository();
    const tvDetailsReaders = {
        [MediaType.SERIES]: new TvDetailsReadService(MediaType.SERIES),
        [MediaType.ANIME]: new TvDetailsReadService(MediaType.ANIME),
    };
    const tvListReaders = {
        [MediaType.SERIES]: new TvListReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvListReadRepository(MediaType.ANIME),
    };
    const tvActivityReaders = {
        [MediaType.SERIES]: new TvActivityReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvActivityReadRepository(MediaType.ANIME),
    };
    const tvStatsReaders = {
        [MediaType.SERIES]: new TvStatsReadRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvStatsReadRepository(MediaType.ANIME),
    };
    const tvCatalogAdmin = {
        [MediaType.SERIES]: new TvCatalogAdminRepository(MediaType.SERIES),
        [MediaType.ANIME]: new TvCatalogAdminRepository(MediaType.ANIME),
    };
    const catalogAdminReaders = {
        [MediaType.SERIES]: tvCatalogAdmin[MediaType.SERIES],
        [MediaType.ANIME]: tvCatalogAdmin[MediaType.ANIME],
        [MediaType.MOVIES]: movieCatalogAdmin,
        [MediaType.GAMES]: gameCatalogAdmin,
        [MediaType.BOOKS]: bookCatalogAdmin,
        [MediaType.MANGA]: mangaCatalogAdmin,
    };
    const catalogManagerEditor = new CatalogManagerEditService(
        tvCatalogAdmin,
        movieCatalogAdmin,
        gameCatalogAdmin,
        bookCatalogAdmin,
        mangaCatalogAdmin,
    );
    const catalogRefreshCandidates = new CatalogRefreshCandidateRepository();
    const upcomingMediaCatalog = new UpcomingMediaCatalogRepository(tvListReaders, movieListReader, gameListReader);
    const libraryCommands = new LibraryCommandService(
        {
            [MediaType.SERIES]: tvLibraryWriter,
            [MediaType.ANIME]: tvLibraryWriter,
        },
        movieLibraryWriter,
        gameLibraryWriter,
        bookLibraryWriter,
        mangaLibraryWriter,
        {
            [MediaType.SERIES]: new TvLibraryReadRepository(MediaType.SERIES),
            [MediaType.ANIME]: new TvLibraryReadRepository(MediaType.ANIME),
        },
        new MovieLibraryReadRepository(),
        new GameLibraryReadRepository(),
        new BookLibraryReadRepository(),
        new MangaLibraryReadRepository(),
    );

    return {
        library: {
            commands: libraryCommands,
            csvExport: new LibraryCsvExportService(),
            statsRebuilder: new LibraryStatsRebuildService(),
        },
        features: {
            tvLibraryWriter,
            movieLibraryWriter,
            gameLibraryWriter,
            bookLibraryWriter,
            mangaLibraryWriter,
            mangaCatalogAdmin,
            mangaDetailsReader,
            mangaListReader,
            mangaActivityReader,
            mangaStatsReader,
            bookCatalogAdmin,
            bookCoverContribution,
            bookCatalogReader,
            bookDetailsReader,
            bookListReader,
            bookActivityReader,
            bookStatsReader,
            gameCatalogAdmin,
            gameDetailsReader,
            gameListReader,
            gameActivityReader,
            gameStatsReader,
            movieDetailsReader,
            movieListReader,
            movieActivityReader,
            movieStatsReader,
            movieCatalogAdmin,
            tvDetailsReaders,
            tvListReaders,
            tvActivityReaders,
            tvStatsReaders,
            tvCatalogAdmin,
            catalogAdminReaders,
            catalogManagerEditor,
            catalogRefreshCandidates,
            upcomingMediaCatalog,
        },
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
