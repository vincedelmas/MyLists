import {AuthorizationService} from "@/lib/server/authorization";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {AdminService} from "@/lib/server/domain/admin/admin.service";
import {SocialService} from "@/lib/server/domain/social/social.service";
import {AccountService} from "@/lib/server/domain/account/account.service";
import {ProfileService} from "@/lib/server/domain/profile/profile.service";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {SocialRepository} from "@/lib/server/domain/social/social.repository";
import {MediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {AccountRepository} from "@/lib/server/domain/account/account.repository";
import {ProfileRepository} from "@/lib/server/domain/profile/profile.repository";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {YearRecapService} from "@/lib/server/domain/year-recap/year-recap.service";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {type CacheManager, setupCacheManager} from "@/lib/server/core/cache-manager";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {MediaTrackingService} from "@/lib/server/domain/tracking/media-tracking.service";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {AchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {TasteSimilarityService} from "@/lib/server/domain/social/taste-similarity.service";
import {type MediaModule, setupMediaModule} from "@/lib/server/core/container/media.module";
import {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";
import {FeatureVotesService} from "@/lib/server/domain/feature-votes/feature-votes.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {type ImportModule, setupImportModule} from "@/lib/server/core/container/import.module";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {TasteSimilarityRepository} from "@/lib/server/domain/social/taste-similarity.repository";
import {InactiveAccountRepository} from "@/lib/server/domain/account/inactive-account.repository";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {type ApiClientModule, type ProviderModule, setupApiClientsModule, setupProviderModule} from "@/lib/server/core/container/provider.module";


interface AppContainer {
    cacheManager: CacheManager;
    apiClients: ApiClientModule;
    registries: MediaModule["registries"] & ImportModule["registries"] & ProviderModule["registries"];
    repositories: {
        stats: typeof StatsRepository;
        social: typeof SocialRepository;
        account: typeof AccountRepository;
        profile: typeof ProfileRepository;
        mediadle: typeof MediadleRepository;
        whichCameFirst: typeof WcfRepository;
        collections: typeof CollectionsRepository;
        activity: typeof MonthlyActivityRepository;
        achievements: typeof AchievementsRepository;
        featureVotes: typeof FeatureVotesRepository;
        notifications: typeof NotificationsRepository;
        updateHistory: typeof UpdateHistoryRepository;
        inactiveAccount: typeof InactiveAccountRepository;
        tasteSimilarity: typeof TasteSimilarityRepository;
    } & ImportModule["repositories"];
    services: {
        stats: StatsService;
        admin: AdminService;
        social: SocialService;
        account: AccountService;
        profile: ProfileService;
        mediadle: MediadleService;
        whichCameFirst: WcfService;
        yearRecap: YearRecapService;
        collections: CollectionsService;
        activity: MonthlyActivityService;
        achievements: AchievementsService;
        featureVotes: FeatureVotesService;
        updateHistory: UpdateHistoryService;
        mediaTracking: MediaTrackingService;
        notifications: NotificationsService;
        authorization: AuthorizationService;
        inactiveAccount: InactiveAccountService;
        tasteSimilarity: TasteSimilarityService;
    } & ImportModule["services"];
}


let containerPromise: Promise<AppContainer> | null = null;


async function initContainer(): Promise<AppContainer> {
    const mediaModule = setupMediaModule();
    const cacheManager = await setupCacheManager();
    const apiClients = await setupApiClientsModule();

    const repositories = {
        stats: StatsRepository,
        social: SocialRepository,
        account: AccountRepository,
        profile: ProfileRepository,
        mediadle: MediadleRepository,
        whichCameFirst: WcfRepository,
        collections: CollectionsRepository,
        activity: MonthlyActivityRepository,
        achievements: AchievementsRepository,
        featureVotes: FeatureVotesRepository,
        notifications: NotificationsRepository,
        updateHistory: UpdateHistoryRepository,
        inactiveAccount: InactiveAccountRepository,
        tasteSimilarity: TasteSimilarityRepository,
    };

    const notificationsService = new NotificationsService(repositories.notifications);
    const inactiveAccountService = new InactiveAccountService(repositories.inactiveAccount);
    const socialService = new SocialService(repositories.social, repositories.notifications);

    const authorizationService = new AuthorizationService(socialService);
    const updateHistoryService = new UpdateHistoryService(repositories.updateHistory);
    const activityService = new MonthlyActivityService(repositories.activity, mediaModule.registries.mediaMonthlyActivity);

    const statsService = new StatsService(
        repositories.stats,
        activityService,
        repositories.achievements,
        repositories.updateHistory,
        mediaModule.registries.mediaStatistics,
    );

    const providerModule = setupProviderModule(mediaModule, apiClients);
    const importModule = setupImportModule(mediaModule, providerModule);

    return {
        apiClients,
        cacheManager,
        repositories: {
            ...repositories,
            ...importModule.repositories,
        },
        services: {
            stats: statsService,
            social: socialService,
            activity: activityService,
            updateHistory: updateHistoryService,
            authorization: authorizationService,
            notifications: notificationsService,
            inactiveAccount: inactiveAccountService,
            admin: new AdminService(AdminRepository),
            mediadle: new MediadleService(repositories.mediadle),
            achievements: new AchievementsService(repositories.achievements),
            account: new AccountService(repositories.account, inactiveAccountService),
            tasteSimilarity: new TasteSimilarityService(repositories.tasteSimilarity),
            profile: new ProfileService(repositories.profile, mediaModule.registries.mediaService),
            featureVotes: new FeatureVotesService(repositories.featureVotes, notificationsService),
            whichCameFirst: new WcfService(repositories.whichCameFirst, mediaModule.registries.mediaService),
            yearRecap: new YearRecapService(repositories.activity, mediaModule.registries.mediaMonthlyActivity),
            collections: new CollectionsService(authorizationService, repositories.collections, mediaModule.registries.mediaService),
            mediaTracking: new MediaTrackingService(
                statsService,
                activityService,
                updateHistoryService,
                notificationsService,
                mediaModule.registries.mediaService,
            ),
            ...importModule.services,
        },
        registries: {
            ...mediaModule.registries,
            ...importModule.registries,
            ...providerModule.registries,
        },
    };
}


export function getContainer() {
    if (!containerPromise) {
        containerPromise = initContainer();
    }
    return containerPromise;
}
