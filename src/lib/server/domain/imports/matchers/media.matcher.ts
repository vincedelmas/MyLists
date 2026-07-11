import {ImportItemStatus} from "@/lib/utils/enums";
import {ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";
import {ExternalMediaMatcher, ImportListWriter, InternalMediaMatcher, MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


export function createMediaMatcher(params: {
    internalMatchers: InternalMediaMatcher[];
    externalMatchers: ExternalMediaMatcher[];
    listWriter: ImportListWriter;
}): MediaMatcher {
    const { internalMatchers, externalMatchers, listWriter } = params;

    async function internalPipeline(items: ImportItemsSelect[]) {
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

    async function* externalPipeline(items: ImportItemsSelect[]) {
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

    return {
        async* match(context: MediaMatcherContext, items: ImportItemsSelect[]) {
            if (items.length === 0) return;

            const { matched, unresolved } = await internalPipeline(items);
            const completedOutcomes = await listWriter.addMatchedItems(context.userId, matched);
            if (completedOutcomes.length > 0) {
                yield completedOutcomes;
            }

            for await (const externalResult of externalPipeline(unresolved)) {
                const externalCompletedOutcomes = await listWriter.addMatchedItems(context.userId, externalResult.matched);
                if (externalCompletedOutcomes.length > 0) {
                    yield externalCompletedOutcomes;
                }

                if (externalResult.skipped.length > 0) {
                    yield externalResult.skipped;
                }

                if (externalResult.failed.length > 0) {
                    yield externalResult.failed;
                }

                if (externalResult.unresolved.length > 0) {
                    yield externalResult.unresolved.map((item) => ({
                        itemId: item.id,
                        matchedMediaId: null,
                        statusReason: "No match found",
                        status: ImportItemStatus.SKIPPED,
                    }));
                }
            }
        }
    };
}
