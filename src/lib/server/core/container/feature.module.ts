import {MediaModule} from "@/lib/server/core/container/media.module";
import {AccountModule} from "@/lib/server/core/container/account.module";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {MediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {FeatureVotesService} from "@/lib/server/domain/feature-votes/feature-votes.service";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {createAchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {achievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {FeatureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


export function setupFeatureModule(mediaModule: MediaModule, accountModule: AccountModule) {
    const repositories = {
        mediadle: MediadleRepository,
        whichCameFirst: WcfRepository,
        collections: CollectionsRepository,
        achievements: achievementsRepository,
        featureVotes: FeatureVotesRepository,
        notifications: NotificationsRepository,
    };
    const notificationsService = new NotificationsService(repositories.notifications);

    return {
        repositories,
        services: {
            notifications: notificationsService,
            mediadle: new MediadleService(repositories.mediadle),
            achievements: createAchievementsService(repositories.achievements),
            featureVotes: new FeatureVotesService(repositories.featureVotes, notificationsService),
            whichCameFirst: new WcfService(repositories.whichCameFirst, mediaModule.registries.mediaService),
            collections: new CollectionsService(
                accountModule.services.authorization,
                repositories.collections,
                mediaModule.registries.mediaService,
            ),
        },
    };
}


export type FeatureModule = ReturnType<typeof setupFeatureModule>;
