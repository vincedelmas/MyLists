import {MediaModule} from "@/lib/server/core/container/media.module";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {MediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {AchievementsQuery} from "@/lib/server/domain/achievements/achievements.query";
import {AchievementCommands} from "@/lib/server/domain/achievements/achievement.commands";
import {FeatureVotesQuery} from "@/lib/server/domain/feature-votes/feature-votes.query";
import {FeatureVoteCommands} from "@/lib/server/domain/feature-votes/feature-vote.commands";
import {NotificationsQuery} from "@/lib/server/domain/notifications/notifications.query";
import {NotificationCommands} from "@/lib/server/domain/notifications/notification.commands";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {InactiveAccountRepository, UserProfileRepository, UserRepository, UserStatsService} from "@/lib/server/domain/user";
import {EditorialCollectionsQuery} from "@/lib/server/domain/collections/editorial-collections.query";
import {EditorialCollectionCommands} from "@/lib/server/domain/collections/editorial-collection.commands";
import {SocialGraphQuery} from "@/lib/server/domain/social/social-graph.query";
import {SocialGraphCommands} from "@/lib/server/domain/social/social-graph.commands";
import {ProfileOverviewQuery} from "@/lib/server/domain/profile/profile-overview.query";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {ProfileUpdatesCommand} from "@/lib/server/domain/profile/profile-updates.command";
import {TasteMatchesReadService} from "@/lib/server/domain/discovery/taste-matches-read.service";
import {HallOfFameReadService} from "@/lib/server/domain/discovery/hall-of-fame-read.service";
import {ProfileChannelAccessRepository} from "@/lib/server/domain/access/profile-channel-access.repository";
import {AccountQuery} from "@/lib/server/domain/user/account.query";
import {AccountSettingsCommands} from "@/lib/server/domain/user/account-settings.commands";
import {AccountDeletionCommands} from "@/lib/server/domain/user/account-deletion.commands";
import {AdminAccountsQuery} from "@/lib/server/domain/user/admin-accounts.query";
import {AdminAccountCommands} from "@/lib/server/domain/user/admin-account.commands";
import {ProfileViewCommands} from "@/lib/server/domain/user/profile-view.commands";
import {InactiveAccountsQuery} from "@/lib/server/domain/user/inactive-accounts.query";
import {InactiveAccountCommands} from "@/lib/server/domain/user/inactive-account.commands";
import {ProfileCustomizationQuery} from "@/lib/server/domain/profile/profile-customization.query";
import {ProfileCustomizationCommands} from "@/lib/server/domain/profile/profile-customization.commands";
import {ProfileHighlightsQuery} from "@/lib/server/domain/profile/profile-highlights.query";
import {ActivityService} from "@/lib/server/domain/activity/activity.service";
import {MediaType} from "@/lib/utils/enums";


export function setupUserModule(mediaModule: MediaModule) {

    // User Repositories
    const userRepository = UserRepository;
    const mediadleRepository = MediadleRepository;
    const whichCameFirstRepository = WcfRepository;
    const userProfileRepository = UserProfileRepository;
    const achievementsRepository = AchievementsRepository;
    const featureVotesRepository = FeatureVotesRepository;
    const notificationsRepository = NotificationsRepository;
    const inactiveAccountRepository = InactiveAccountRepository;

    // User Services
    const inactiveAccountsQuery = new InactiveAccountsQuery(inactiveAccountRepository);
    const inactiveAccountCommands = new InactiveAccountCommands(inactiveAccountRepository);
    const accountQuery = new AccountQuery(userRepository);
    const accountSettingsCommands = new AccountSettingsCommands(userRepository);
    const accountDeletionCommands = new AccountDeletionCommands(inactiveAccountCommands, userRepository);
    const adminAccountsQuery = new AdminAccountsQuery(userRepository);
    const adminAccountCommands = new AdminAccountCommands(accountDeletionCommands, userRepository);
    const profileViewCommands = new ProfileViewCommands(new ProfileChannelAccessRepository(), userRepository);
    const mediadleService = new MediadleService(
        mediadleRepository,
        mediaModule.get(MediaType.MOVIES).features.mediadle,
    );
    const profileUpdatesQuery = new ProfileUpdatesQuery();
    const profileUpdatesCommand = new ProfileUpdatesCommand();
    const achievementsQuery = new AchievementsQuery(undefined, achievementsRepository);
    const achievementCommands = new AchievementCommands(achievementsRepository);
    const notificationsQuery = new NotificationsQuery(notificationsRepository);
    const notificationCommands = new NotificationCommands(notificationsRepository);
    const whichCameFirstService = new WcfService(whichCameFirstRepository, mediaModule);
    const profileHighlights = new ProfileHighlightsQuery();
    const profileCustomizationQuery = new ProfileCustomizationQuery(userProfileRepository, profileHighlights);
    const profileCustomizationCommands = new ProfileCustomizationCommands(userProfileRepository);
    const featureVotesQuery = new FeatureVotesQuery(featureVotesRepository);
    const featureVoteCommands = new FeatureVoteCommands(featureVotesRepository, notificationCommands);
    const activityService = new ActivityService(mediaModule);
    const editorialCollectionsQuery = new EditorialCollectionsQuery();
    const editorialCollectionsCommands = new EditorialCollectionCommands();
    const socialGraphQuery = new SocialGraphQuery();
    const socialGraphCommands = new SocialGraphCommands();
    const userStatsService = new UserStatsService(activityService, mediaModule);
    const profileOverview = new ProfileOverviewQuery(
        userStatsService,
        profileHighlights,
        profileUpdatesQuery,
        achievementsQuery,
        socialGraphQuery,
    );
    const tasteMatchesReader = new TasteMatchesReadService();
    const hallOfFameReader = new HallOfFameReadService();
    const profileChannelAccess = new ProfileChannelAccessRepository();

    return {
        account: {
            query: accountQuery,
            settings: accountSettingsCommands,
            deletion: accountDeletionCommands,
            adminQuery: adminAccountsQuery,
            adminCommands: adminAccountCommands,
            profileViews: profileViewCommands,
        },
        inactiveAccounts: {
            query: inactiveAccountsQuery,
            commands: inactiveAccountCommands,
        },
        profile: {
            overview: profileOverview,
            updates: {
                query: profileUpdatesQuery,
                commands: profileUpdatesCommand,
            },
            channels: profileChannelAccess,
            customization: {
                query: profileCustomizationQuery,
                commands: profileCustomizationCommands,
            },
        },
        social: {
            query: socialGraphQuery,
            commands: socialGraphCommands,
        },
        collections: {
            query: editorialCollectionsQuery,
            commands: editorialCollectionsCommands,
        },
        discovery: {
            tasteMatches: tasteMatchesReader,
            hallOfFame: hallOfFameReader,
        },
        activity: activityService,
        stats: userStatsService,
        achievements: {
            query: achievementsQuery,
            commands: achievementCommands,
        },
        notifications: {
            query: notificationsQuery,
            commands: notificationCommands,
        },
        featureVotes: {
            query: featureVotesQuery,
            commands: featureVoteCommands,
        },
        games: {
            mediadle: mediadleService,
            whichCameFirst: whichCameFirstService,
        },
    };
}


export type UserModule = ReturnType<typeof setupUserModule>;
