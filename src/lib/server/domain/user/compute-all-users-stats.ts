import {MediaType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";
import {UserStatsRepository} from "@/lib/server/domain/user/user-stats.repository";


type ComputeAllUsersStatsHooks = {
    onEmpty?: (mediaType: MediaType) => void;
    runStep?: (mediaType: MediaType, operation: () => Promise<void>) => Promise<unknown>;
};


export const computeAllUsersStats = async (
    mediaStatsRegistry: MediaStatsRegistry,
    hooks: ComputeAllUsersStatsHooks = {},
) => {
    const runStep = hooks.runStep ?? ((_mediaType, operation) => operation());

    for (const mediaType of Object.values(MediaType)) {
        await runStep(mediaType, async () => {
            const mediaStatistics = mediaStatsRegistry.get(mediaType);

            await withTransaction(async () => {
                const userMediaStats = await mediaStatistics.computeAllUsersStats();

                if (userMediaStats.length === 0) {
                    hooks.onEmpty?.(mediaType);
                }

                await UserStatsRepository.updateAllUsersPreComputedStats(mediaType, userMediaStats);
            });
        });
    }
};
