import * as schema from "./schema";
import {defineRelations} from "drizzle-orm";


export const relations = defineRelations(schema, r => ({
    user: {
        userMediaSettings: r.many.userMediaSettings({ from: r.user.id, to: r.userMediaSettings.userId }),
    },
    achievement: {
        tiers: r.many.achievementTier({ from: r.achievement.id, to: r.achievementTier.achievementId }),
    },
    socialNotifications: {
        actor: r.one.user({ from: r.socialNotifications.actorId, to: r.user.id, optional: false }),
        featureRequest: r.one.featureRequests({ from: r.socialNotifications.featureRequestId, to: r.featureRequests.id }),
    },
}));
