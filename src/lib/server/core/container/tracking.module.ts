import {FeatureModule} from "@/lib/server/core/container/feature.module";
import {MediaModule} from "@/lib/server/core/container/media.module";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {MediaTrackingService} from "@/lib/server/domain/tracking/media-tracking.service";
import {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {YearRecapService} from "@/lib/server/domain/year-recap/year-recap.service";


export function setupTrackingModule(mediaModule: MediaModule, featureModule: FeatureModule) {
    const repositories = {
        stats: StatsRepository,
        activity: MonthlyActivityRepository,
        updateHistory: UpdateHistoryRepository,
    };

    const updateHistoryService = new UpdateHistoryService(repositories.updateHistory);
    const activityService = new MonthlyActivityService(repositories.activity, mediaModule.registries.mediaMonthlyActivity);

    const statsService = new StatsService(
        repositories.stats,
        activityService,
        featureModule.repositories.achievements,
        repositories.updateHistory,
        mediaModule.registries.mediaStatistics,
    );

    return {
        repositories,
        services: {
            stats: statsService,
            activity: activityService,
            updateHistory: updateHistoryService,
            yearRecap: new YearRecapService(repositories.activity, mediaModule.registries.mediaMonthlyActivity),
            mediaTracking: new MediaTrackingService(
                statsService,
                activityService,
                updateHistoryService,
                featureModule.services.notifications,
                mediaModule.registries.mediaService,
            ),
        },
    };
}


export type TrackingModule = ReturnType<typeof setupTrackingModule>;
