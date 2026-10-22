import { MediaType, RoleType } from "@/lib/utils/enums";
import { hasRequiredRole, type Actor } from "@/lib/server/authorization";
import { getContainer } from "@/lib/server/core/container";
import { logger } from "@/lib/server/core/logger";
import { FormattedError } from "@/lib/utils/error-classes";
import { dateFromUTCInput } from "@/lib/utils/formatting/date";
import { isManualBookId } from "@/lib/media-definitions/books/book.definition.server";

export function getMediaRefreshAvailability(
    actor: Actor,
    mediaType: MediaType,
    media: { apiId: number | string; lastApiUpdate: string | null },
) {
    const manager = hasRequiredRole(actor, RoleType.MANAGER);
    let reason: string | null = null;
    let nextAllowedAt: string | null = null;
    if (!manager && mediaType === MediaType.BOOKS) reason = "Unauthorized to refresh book metadata.";
    else if (mediaType === MediaType.BOOKS && isManualBookId(String(media.apiId)))
        reason = "Manually added books do not have Google Books metadata to refresh.";
    else if (!manager && media.lastApiUpdate) {
        const next = dateFromUTCInput(media.lastApiUpdate).getTime() + 24 * 60 * 60 * 1000;
        if (Date.now() < next) {
            nextAllowedAt = new Date(next).toISOString();
            reason = "You can refresh metadata once every 24 hours.";
        }
    }
    return { allowed: reason === null, reason, nextAllowedAt };
}

export async function refreshCatalogMedia(actor: Actor, mediaType: MediaType, mediaId: number) {
    if (actor.kind !== "user") throw new FormattedError("Sign in to refresh metadata.");
    const { services, registries } = await getContainer();
    const media = registries.mediaService.get(mediaType).findById(mediaId);
    if (!media) throw new FormattedError("Media not found, cannot refresh metadata.");
    const availability = getMediaRefreshAvailability(actor, mediaType, media);
    if (!availability.allowed) throw new FormattedError(availability.reason!);
    await registries.ingestionServices.get(mediaType).refreshFromExternal(media.apiId);
    void services.admin.logMediaRefresh({ userId: actor.id, mediaType, apiId: media.apiId }).catch((err) => {
        logger.warn({ err, userId: actor.id, mediaType, apiId: media.apiId }, "Failed to log media refresh");
    });
    return { kind: "saved" as const };
}
