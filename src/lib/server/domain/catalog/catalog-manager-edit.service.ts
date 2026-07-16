import {notFound} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvCatalogAdminRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-admin.repository";
import {GameCatalogAdminRepository} from "@/lib/server/domain/catalog/games/game-catalog-admin.repository";
import {BookCatalogAdminRepository} from "@/lib/server/domain/catalog/books/book-catalog-admin.repository";
import {MangaCatalogAdminRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-admin.repository";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-admin.repository";


/** Explicit family commands for the manager form; provider refresh remains a separate ingestion boundary. */
export class CatalogManagerEditService {
    constructor(
        private readonly tv: Record<TvMediaType, TvCatalogAdminRepository>,
        private readonly movies: MovieCatalogAdminRepository,
        private readonly games: GameCatalogAdminRepository,
        private readonly books: BookCatalogAdminRepository,
        private readonly manga: MangaCatalogAdminRepository,
    ) {}

    async update(kind: MediaType, catalogItemId: number, payload: Record<string, unknown>) {
        const imageCover = await saveCover(kind, payload.imageCover);
        let updated: boolean;

        if (kind === MediaType.SERIES || kind === MediaType.ANIME) {
            updated = await this.tv[kind].updateEditableFields(catalogItemId, {
                imageCover,
                name: stringValue(payload.name) as string | undefined,
                originalName: stringValue(payload.originalName),
                releaseDate: stringValue(payload.releaseDate),
                lastAirDate: stringValue(payload.lastAirDate),
                homepage: stringValue(payload.homepage),
                createdBy: stringValue(payload.createdBy),
                duration: numberValue(payload.duration, "duration", false),
                originCountry: stringValue(payload.originCountry),
                prodStatus: stringValue(payload.prodStatus),
                synopsis: stringValue(payload.synopsis),
                lockStatus: booleanValue(payload.lockStatus),
            });
        }
        else if (kind === MediaType.MOVIES) {
            updated = await this.movies.updateEditableFields(catalogItemId, {
                imageCover,
                originalName: stringValue(payload.originalName),
                name: stringValue(payload.name) as string | undefined,
                directorName: stringValue(payload.directorName),
                releaseDate: stringValue(payload.releaseDate),
                duration: numberValue(payload.duration, "duration", false),
                synopsis: stringValue(payload.synopsis),
                budget: numberValue(payload.budget, "budget", true),
                revenue: numberValue(payload.revenue, "revenue", true),
                tagline: stringValue(payload.tagline),
                originalLanguage: stringValue(payload.originalLanguage),
                lockStatus: booleanValue(payload.lockStatus),
                homepage: stringValue(payload.homepage),
            });
        }
        else if (kind === MediaType.GAMES) {
            updated = await this.games.updateEditableFields(catalogItemId, {
                imageCover,
                name: stringValue(payload.name) as string | undefined,
                gameEngine: stringValue(payload.gameEngine),
                gameModes: stringValue(payload.gameModes),
                playerPerspective: stringValue(payload.playerPerspective),
                releaseDate: stringValue(payload.releaseDate),
                synopsis: stringValue(payload.synopsis),
                hltbMainTime: numberValue(payload.hltbMainTime, "hltbMainTime", true),
                hltbMainAndExtraTime: numberValue(payload.hltbMainAndExtraTime, "hltbMainAndExtraTime", true),
                hltbTotalCompleteTime: numberValue(payload.hltbTotalCompleteTime, "hltbTotalCompleteTime", true),
                lockStatus: booleanValue(payload.lockStatus),
            });
        }
        else if (kind === MediaType.BOOKS) {
            updated = await this.books.updateEditableFields(catalogItemId, {
                imageCover,
                name: stringValue(payload.name) as string | undefined,
                releaseDate: stringValue(payload.releaseDate),
                pages: numberValue(payload.pages, "pages", false),
                language: stringValue(payload.language),
                publishers: stringValue(payload.publishers),
                synopsis: stringValue(payload.synopsis),
                lockStatus: booleanValue(payload.lockStatus),
                authors: authorNames(payload.authors),
            });
        }
        else {
            updated = await this.manga.updateEditableFields(catalogItemId, {
                imageCover,
                name: stringValue(payload.name) as string | undefined,
                releaseDate: stringValue(payload.releaseDate),
                chapters: numberValue(payload.chapters, "chapters", true),
                publishers: stringValue(payload.publishers),
                synopsis: stringValue(payload.synopsis),
                lockStatus: booleanValue(payload.lockStatus),
                genres: relationNames(payload.genres),
            });
        }

        if (!updated) throw notFound();
    }
}


const saveCover = async (kind: MediaType, value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return saveImageFromUrl({ imageUrl: value, dirSaveName: `${kind}-covers` });
};


const stringValue = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return String(value);
};


const booleanValue = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === true || value === "true" || value === 1) return true;
    if (value === false || value === "false" || value === 0) return false;
    throw new FormattedError("Invalid lock status.");
};


function numberValue(value: unknown, field: string, nullable: false): number | undefined;
function numberValue(value: unknown, field: string, nullable: true): number | null | undefined;
function numberValue(value: unknown, field: string, nullable: boolean): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return nullable ? null : 0;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new FormattedError(`Invalid ${field}.`);
    return number;
}


const authorNames = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return value.split(",").map((name) => name.trim()).filter(Boolean);
};


const relationNames = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    return value.map((entry) => typeof entry === "string" ? entry : (entry as { name?: unknown })?.name)
        .filter((name): name is string => typeof name === "string" && !!name.trim());
};
