import {MediaModule} from "@/lib/server/core/container/media.module";
import {AccountModule} from "@/lib/server/core/container/account.module";
import {WcfService} from "@/lib/server/domain/which-came-first/wcf.service";
import {WcfRepository} from "@/lib/server/domain/which-came-first/wcf.repository";
import {createMediadleService} from "@/lib/server/domain/mediadle/mediadle.service";
import {mediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";
import {createCollectionsService} from "@/lib/server/domain/collections/collections.service";
import {createNotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {collectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {createAchievementsService} from "@/lib/server/domain/achievements/achievements.service";
import {achievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {createFeatureVotesService} from "@/lib/server/domain/feature-votes/feature-votes.service";
import {featureVotesRepository} from "@/lib/server/domain/feature-votes/feature-votes.repository";
import {notificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


export function setupFeatureModule(mediaModule: MediaModule, accountModule: AccountModule) {
    const repositories = {
        mediadle: mediadleRepository,
        whichCameFirst: WcfRepository,
        collections: collectionsRepository,
        achievements: achievementsRepository,
        featureVotes: featureVotesRepository,
        notifications: notificationsRepository,
    };
    const notificationsService = createNotificationsService(repositories.notifications);

    return {
        repositories,
        services: {
            notifications: notificationsService,
            mediadle: createMediadleService(repositories.mediadle, mediaModule.registries.mediadleCatalog),
            achievements: createAchievementsService(repositories.achievements),
            featureVotes: createFeatureVotesService(repositories.featureVotes, notificationsService),
            whichCameFirst: new WcfService(repositories.whichCameFirst, mediaModule.registries.mediaService),
            collections: createCollectionsService(
                accountModule.services.authorization,
                repositories.collections,
                mediaModule.registries.mediaService,
            ),
        },
    };
}


export type FeatureModule = ReturnType<typeof setupFeatureModule>;
