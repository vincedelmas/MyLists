import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {GamesService} from "@/lib/server/domain/media/games/games.service";
import {GamesProviderService} from "@/lib/server/domain/media/games/games-provider.service";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {GamesImportListWriter} from "@/lib/server/domain/imports/list-writers/games-import-list.writer";
import {internalMediaMatcherPipeline} from "@/lib/server/domain/imports/matchers/internal-media.matcher";
import {IgdbGameExternalImportResolver} from "@/lib/server/domain/imports/matchers/game-external-import.resolver";
import {ExternalImportResolver, InternalMatcherPipeline, MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const MATCH_NOT_FOUND_REASON = "No game match found";


export class GamesMatcher implements MediaMatcher {
    constructor(
        private internalMatcherPipeline: InternalMatcherPipeline,
        private listWriter: GamesImportListWriter,
        private externalResolver: ExternalImportResolver,
    ) {
    }

    static create(gamesService: GamesService, gamesProviderService: GamesProviderService) {
        return new GamesMatcher(
            internalMediaMatcherPipeline([
                internalApiIdMatcher(ApiProviderType.IGDB, gamesService),
                internalNameDateMatcher(gamesService),
            ]),
            new GamesImportListWriter(gamesService),
            new IgdbGameExternalImportResolver(gamesProviderService),
        );
    }

    async* match(context: MediaMatcherContext, items: ImportItemsSelect[]) {
        if (items.length === 0) return;

        const { matched, unresolved } = await this.internalMatcherPipeline.run(items);
        const completedOutcomes = await this.listWriter.addMatchedItems(context.userId, matched);
        if (completedOutcomes.length > 0) {
            yield completedOutcomes;
        }

        for await (const externalResult of this.externalResolver.resolve(unresolved)) {
            const externalCompletedOutcomes = await this.listWriter.addMatchedItems(context.userId, externalResult.matched);
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
                    status: ImportItemStatus.SKIPPED,
                    statusReason: MATCH_NOT_FOUND_REASON,
                }));
            }
        }
    }
}
