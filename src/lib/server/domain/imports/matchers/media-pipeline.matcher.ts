import {ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";
import {ExternalMatcherPipeline, ExternalMediaMatcher, InternalMatcherPipeline, InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


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


export const externalMediaMatcherPipeline = (externalMatchers: ExternalMediaMatcher[]) => ({
    async* run(items: ImportItemsSelect[]) {
        let stillUnresolved = items;

        for (const matcher of externalMatchers) {
            if (stillUnresolved.length === 0) break;

            const nextUnresolved: ImportItemsSelect[] = [];

            for await (const result of matcher.match(stillUnresolved)) {
                nextUnresolved.push(...result.unresolved);

                const terminalResult = {
                    unresolved: [],
                    failed: result.failed,
                    matched: result.matched,
                    skipped: result.skipped,
                };

                if (result.matched.length > 0 || result.failed.length > 0 || result.skipped.length > 0) {
                    yield terminalResult;
                }
            }

            stillUnresolved = nextUnresolved;
        }

        if (stillUnresolved.length > 0) {
            yield {
                failed: [],
                matched: [],
                skipped: [],
                unresolved: stillUnresolved,
            };
        }
    }
}) satisfies ExternalMatcherPipeline;
