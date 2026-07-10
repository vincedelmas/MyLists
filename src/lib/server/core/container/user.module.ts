import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {MediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {AchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {FeatureVotesService} from "@/lib/server/domain/feature-votes/feature-votes.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {
    InactiveAccountRepository,
    InactiveAccountService,
    UserActivityRepository,
    UserActivityService,
    UserMediaService,
    UserProfileRepository,
    UserProfileService,
    UserRepository,
    UserService,
    UserSimilarityRepository,
    UserSimilarityService,
    UserStatsRepository,
    UserStatsService,
    UserUpdatesRepository,
    UserUpdatesService
} from "@/lib/server/domain/user";


export function setupUserModule(mediaServiceRegistry: typeof MediaServiceRegistry) {
    // User Repositories
    const userRepository = UserRepository;
    const mediadleRepository = MediadleRepository;
    const whichCameFirstRepository = WcfRepository;
    const userStatsRepository = UserStatsRepository;
    const userUpdatesRepository = UserUpdatesRepository;
    const userProfileRepository = UserProfileRepository;
    const collectionsRepository = CollectionsRepository;
    const userActivityRepository = UserActivityRepository;
    const achievementsRepository = AchievementsRepository;
    const featureVotesRepository = FeatureVotesRepository;
    const notificationsRepository = NotificationsRepository;
    const userSimilarityRepository = UserSimilarityRepository;
    const inactiveAccountRepository = InactiveAccountRepository;

    // User Services
    const inactiveAccountService = new InactiveAccountService(inactiveAccountRepository);
    const mediadleService = new MediadleService(mediadleRepository);
    const userUpdatesService = new UserUpdatesService(userUpdatesRepository);
    const userService = new UserService(userRepository, inactiveAccountService);
    const achievementsService = new AchievementsService(achievementsRepository);
    const notificationsService = new NotificationsService(notificationsRepository);
    const userSimilarityService = new UserSimilarityService(userSimilarityRepository);
    const whichCameFirstService = new WcfService(whichCameFirstRepository, mediaServiceRegistry);
    const userProfileService = new UserProfileService(userProfileRepository, mediaServiceRegistry);
    const featureVotesService = new FeatureVotesService(featureVotesRepository, notificationsService);
    const userActivityService = new UserActivityService(userActivityRepository, mediaServiceRegistry);
    const collectionsService = new CollectionsService(userService, collectionsRepository, mediaServiceRegistry);
    const userStatsService = new UserStatsService(userStatsRepository, userActivityService, achievementsRepository, userUpdatesRepository, mediaServiceRegistry);
    const userMediaService = new UserMediaService(userStatsService, userActivityService, userUpdatesService, notificationsService, mediaServiceRegistry);

    return {
        repositories: {
            user: userRepository,
            mediadle: mediadleRepository,
            userStats: userStatsRepository,
            userUpdates: userUpdatesRepository,
            userProfile: userProfileRepository,
            collections: collectionsRepository,
            achievements: achievementsRepository,
            userActivity: userActivityRepository,
            featureVotes: featureVotesRepository,
            notifications: notificationsRepository,
            whichCameFirst: whichCameFirstRepository,
            userSimilarity: userSimilarityRepository,
            inactiveAccount: inactiveAccountRepository,
        },
        services: {
            user: userService,
            mediadle: mediadleService,
            userMedia: userMediaService,
            userStats: userStatsService,
            userProfile: userProfileService,
            userUpdates: userUpdatesService,
            collections: collectionsService,
            userActivity: userActivityService,
            achievements: achievementsService,
            featureVotes: featureVotesService,
            notifications: notificationsService,
            userSimilarity: userSimilarityService,
            whichCameFirst: whichCameFirstService,
            inactiveAccount: inactiveAccountService,
        },
    };
}


export type UserModule = ReturnType<typeof setupUserModule>;
