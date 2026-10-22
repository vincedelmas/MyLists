import { calculateMediaLevel } from "@/lib/utils/media/level";
import { toActor } from "@/lib/server/authorization";
import { getContainer } from "@/lib/server/core/container";
import { getMobileProfile } from "./profile";
import { dateFromUTCInput } from "@/lib/utils/formatting/date";
import { mobileImagePath } from "./images";

export const getMobilePerson = async (viewerId: number, targetId: number) => {
    const { services } = await getContainer();
    const target = await services.account.getUserById(targetId);
    if (!target) return null;
    const decision = await services.authorization.decideProfile(toActor({ id: viewerId }), target);
    const following = services.social.getFollowingStatus(viewerId, targetId);
    const header = {
        isOwn: viewerId === targetId,
        id: target.id,
        level: Math.floor(
            calculateMediaLevel(
                target.userMediaSettings
                    .filter((setting) => setting.active)
                    .reduce((sum, setting) => sum + setting.timeSpent, 0),
            ),
        ),
        name: target.name,
        privacy: target.privacy,
        createdAt: dateFromUTCInput(target.createdAt).toISOString(),
        image: target.image ? mobileImagePath(target.image) : null,
        backgroundImage: mobileImagePath(target.backgroundImage),
    };
    if (!decision.allowed) return { access: "private" as const, header, following: following?.status ?? null };
    const profile = await getMobileProfile(targetId);
    return { access: "allowed" as const, header, following: following?.status ?? null, profile: profile! };
};
