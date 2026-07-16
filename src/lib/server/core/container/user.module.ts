import {MediaModule} from "@/lib/server/core/container/media.module";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {MediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {AchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {FeatureVotesService} from "@/lib/server/domain/feature-votes/feature-votes.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {
    InactiveAccountRepository,
    InactiveAccountService,
    UserActivityService,
    UserProfileRepository,
    UserProfileService,
    UserRepository,
    UserService,
    UserSimilarityRepository,
    UserSimilarityService,
    UserStatsService,
    UserUpdatesService
} from "@/lib/server/domain/user";
import {EditorialCollectionsReadService} from "@/lib/server/domain/collections/editorial-collections-read.service";
import {EditorialCollectionsCommandService} from "@/lib/server/domain/collections/editorial-collections-command.service";
import {SocialGraphReadService} from "@/lib/server/domain/social/social-graph-read.service";
import {SocialGraphCommandService} from "@/lib/server/domain/social/social-graph-command.service";
import {ProfileReadService} from "@/lib/server/domain/profile/profile-read.service";
import {TasteMatchesReadService} from "@/lib/server/domain/discovery/taste-matches-read.service";
import {HallOfFameReadService} from "@/lib/server/domain/discovery/hall-of-fame-read.service";
import {MediadleMovieCatalogRepository} from "@/lib/server/domain/mediadle/mediadle-movie-catalog";
import {WcfMediaCatalogRepository} from "@/lib/server/domain/which-came-first/wcf-media-catalog";
import {ProfileChannelAccessRepository} from "@/lib/server/domain/access/profile-channel-access.repository";


export function setupUserModule(mediaModule: MediaModule) {

    // User Repositories
    const userRepository = UserRepository;
    const mediadleRepository = MediadleRepository;
    const whichCameFirstRepository = WcfRepository;
    const userProfileRepository = UserProfileRepository;
    const achievementsRepository = AchievementsRepository;
    const featureVotesRepository = FeatureVotesRepository;
    const notificationsRepository = NotificationsRepository;
    const userSimilarityRepository = UserSimilarityRepository;
    const inactiveAccountRepository = InactiveAccountRepository;

    // User Services
    const inactiveAccountService = new InactiveAccountService(inactiveAccountRepository);
    const mediadleService = new MediadleService(mediadleRepository, new MediadleMovieCatalogRepository());
    const userUpdatesService = new UserUpdatesService();
    const userService = new UserService(
        userRepository,
        inactiveAccountService,
    );
    const achievementsService = new AchievementsService(achievementsRepository);
    const notificationsService = new NotificationsService(notificationsRepository);
    const userSimilarityService = new UserSimilarityService(userSimilarityRepository);
    const whichCameFirstService = new WcfService(whichCameFirstRepository, new WcfMediaCatalogRepository());
    const userProfileService = new UserProfileService(userProfileRepository);
    const featureVotesService = new FeatureVotesService(featureVotesRepository, notificationsService);
    const userActivityService = new UserActivityService();
    const editorialCollectionsReader = new EditorialCollectionsReadService();
    const editorialCollectionsCommands = new EditorialCollectionsCommandService();
    const socialGraphReader = new SocialGraphReadService();
    const socialGraphCommands = new SocialGraphCommandService();
    const userStatsService = new UserStatsService(
        userActivityService,
        mediaModule.features.tvStatsReaders,
        mediaModule.features.movieStatsReader,
        mediaModule.features.gameStatsReader,
        mediaModule.features.bookStatsReader,
        mediaModule.features.mangaStatsReader,
    );
    const profileReader = new ProfileReadService(
        userStatsService,
        userProfileService,
        userUpdatesService,
        achievementsService,
        socialGraphReader,
    );
    const tasteMatchesReader = new TasteMatchesReadService();
    const hallOfFameReader = new HallOfFameReadService();
    const profileChannelAccess = new ProfileChannelAccessRepository();

    return {
        repositories: {
            user: userRepository,
            mediadle: mediadleRepository,
            userProfile: userProfileRepository,
            achievements: achievementsRepository,
            featureVotes: featureVotesRepository,
            notifications: notificationsRepository,
            whichCameFirst: whichCameFirstRepository,
            userSimilarity: userSimilarityRepository,
            inactiveAccount: inactiveAccountRepository,
        },
        services: {
            user: userService,
            mediadle: mediadleService,
            userStats: userStatsService,
            userProfile: userProfileService,
            userUpdates: userUpdatesService,
            userActivity: userActivityService,
            achievements: achievementsService,
            featureVotes: featureVotesService,
            notifications: notificationsService,
            userSimilarity: userSimilarityService,
            whichCameFirst: whichCameFirstService,
            inactiveAccount: inactiveAccountService,
        },
        features: {
            editorialCollectionsReader,
            editorialCollectionsCommands,
            socialGraphReader,
            socialGraphCommands,
            profileReader,
            tasteMatchesReader,
            hallOfFameReader,
            profileChannelAccess,
        },
    };
}


export type UserModule = ReturnType<typeof setupUserModule>;
