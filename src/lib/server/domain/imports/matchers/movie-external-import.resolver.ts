import {ImportMatcherItem, MatchedImportItem} from "@/lib/types/imports.types";


export interface MovieExternalImportResolverResult {
    matched: MatchedImportItem[];
    unresolved: ImportMatcherItem[];
}


export interface MovieExternalImportResolver {
    resolve(items: ImportMatcherItem[]): Promise<MovieExternalImportResolverResult>;
}


export class NoopMovieExternalImportResolver implements MovieExternalImportResolver {
    async resolve(items: ImportMatcherItem[]) {
        return {
            matched: [],
            unresolved: items,
        };
    }
}
