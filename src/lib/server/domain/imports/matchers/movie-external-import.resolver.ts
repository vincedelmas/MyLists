import {ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {MoviesProviderService} from "@/lib/server/domain/media/movies/movies-provider.service";
import {ImportItemOutcome, ImportMatcherItem, MatchedImportItem} from "@/lib/types/imports.types";


const MOVIE_API_MATCH_NOT_FOUND_REASON = "Movie API match not found";
const MOVIE_API_MATCH_AMBIGUOUS_REASON = "Movie API match is ambiguous";


export interface MovieExternalImportResolverResult {
    matched: MatchedImportItem[];
    skipped: ImportItemOutcome[];
    unresolved: ImportMatcherItem[];
}


export interface MovieExternalImportResolver {
    resolve(items: ImportMatcherItem[]): Promise<MovieExternalImportResolverResult>;
}


export class TmdbMovieExternalImportResolver implements MovieExternalImportResolver {
    constructor(
        private moviesService: MoviesService,
        private moviesProviderService: MoviesProviderService,
    ) {
    }

    async resolve(items: ImportMatcherItem[]) {
        const matched: MatchedImportItem[] = [];
        const skipped: ImportItemOutcome[] = [];

        for (const item of items) {
            if (!item.name) {
                skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_NOT_FOUND_REASON));
                continue;
            }

            const searchResults = await this.moviesProviderService.search(item.name);
            const candidates = this._filterCandidates(searchResults.data, item.releaseDate);

            if (candidates.length === 0) {
                skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_NOT_FOUND_REASON));
                continue;
            }

            if (candidates.length > 1) {
                skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_AMBIGUOUS_REASON));
                continue;
            }

            const [candidate] = candidates;
            const mediaId = await this.moviesService.resolveExternalMedia(candidate.id, this.moviesProviderService);
            matched.push({ item, mediaId });
        }

        return {
            matched,
            skipped,
            unresolved: [],
        };
    }

    private _filterCandidates(candidates: ProviderSearchResult[], releaseDate: string | null) {
        const movieCandidates = candidates.filter((candidate) => candidate.itemType === MediaType.MOVIES);
        if (!releaseDate) return movieCandidates;
        
        return movieCandidates.filter((candidate) => {
            if (!candidate.date) return false;
            return String(candidate.date).startsWith(releaseDate);
        });
    }

    private _createSkippedOutcome(item: ImportMatcherItem, statusReason: string) {
        return {
            statusReason,
            itemId: item.id,
            matchedMediaId: null,
            status: ImportItemStatus.SKIPPED,
        };
    }
}
