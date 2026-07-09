import {ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";
import {InternalMatcherPipeline, InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


export const internalMediaMatcherPipeline = (internalMatchers: InternalMediaMatcher[]) => ({
    async run(items: ImportItemsSelect[]) {
        let currentUnresolved = items;
        const allMatched: MatchedImportItem[] = [];

        for (const matcher of internalMatchers) {
            if (currentUnresolved.length === 0) break;

            const { matched, unresolved } = await matcher.match(currentUnresolved);
            allMatched.push(...matched);
            currentUnresolved = unresolved;
        }

        return {
            matched: allMatched,
            unresolved: currentUnresolved,
        };
    }
}) satisfies InternalMatcherPipeline;
