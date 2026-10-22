import * as z from "zod";
import { notFound } from "@tanstack/react-router";
import { getContainer } from "@/lib/server/core/container";
import { toActor, hasRequiredRole } from "@/lib/server/authorization";
import { RoleType } from "@/lib/utils/enums";
import { UnauthorizedError } from "@/lib/utils/error-classes";
import { mobileImagePath } from "./images";
import { getMobileMedia, mediaParamsSchema } from "./media";
import { editMediaDetailsSchema } from "@/lib/schemas/media-details.schema";
import { refreshCatalogMedia } from "@/lib/server/domain/media/media-refresh";
import { dateFromUTCInput } from "@/lib/utils/formatting/date";

type Params = z.infer<typeof mediaParamsSchema>;

export async function getMobileMediaDetails(userId: number, { mediaType, mediaId }: Params) {
    const { services, registries } = await getContainer();
    const { media, similarMedia } = await registries.mediaService
        .get(mediaType)
        .getMediaAndUserDetails(undefined, mediaId);
    const collections = await services.collections.getMediaCommunityCollections(
        mediaId,
        mediaType,
        toActor({ id: userId }),
    );
    return {
        genres: media.genres.filter((item) => item.name),
        actors: (media.actors ?? []).filter((item) => item.name),
        authors: (media.authors ?? []).filter((item) => item.name),
        companies: (media.companies ?? []).filter((item) => item.name),
        platforms: (media.platforms ?? []).filter((item) => item.name),
        networks: (media.networks ?? []).filter((item) => item.name),
        similar: similarMedia.map((item) => ({ ...item, mediaCover: mobileImagePath(item.mediaCover) })),
        collections: collections.map(({ id, title, description, itemsCount, likeCount, ownerName }) => ({
            id,
            title,
            description,
            itemsCount,
            likeCount,
            ownerName,
        })),
    };
}

export async function getMobileMediaCommunity(userId: number, { mediaType, mediaId }: Params, page: number) {
    const { registries } = await getContainer();
    const service = registries.mediaService.get(mediaType);
    const [community, follows] = await Promise.all([
        service.getMediaCommunityActivity(toActor({ id: userId }), mediaId, { page, perPage: 20 }),
        page === 1 ? service.getUserFollowsMediaData(userId, mediaId) : [],
    ]);
    const summarize = (item: (typeof community.items)[number], includeComment = false) => {
        // Drizzle erases the generic list columns in this community projection.
        const tracking = item.userMedia as NonNullable<Awaited<ReturnType<typeof getMobileMedia>>["tracking"]>;
        return {
            id: item.id,
            name: item.name,
            image: item.image ? mobileImagePath(item.image) : null,
            ratingSystem: item.ratingSystem,
            status: tracking.status,
            rating: tracking.rating,
            favorite: tracking.favorite,
            comment: includeComment ? tracking.comment : null,
            progress: {
                season: "currentSeason" in tracking ? tracking.currentSeason : null,
                episode: "currentEpisode" in tracking ? tracking.currentEpisode : null,
                playtimeMinutes: "playtime" in tracking ? tracking.playtime : null,
                pages: "actualPage" in tracking ? tracking.actualPage : null,
                chapters: "currentChapter" in tracking ? tracking.currentChapter : null,
                repeats: "redo" in tracking ? tracking.redo : null,
                platform: "platform" in tracking ? tracking.platform : null,
            },
            updatedAt: tracking.lastUpdated ? dateFromUTCInput(tracking.lastUpdated).toISOString() : null,
        };
    };
    return {
        page,
        pages: community.pages,
        total: community.total,
        stats: community.stats,
        items: community.items.map((item) => summarize(item)),
        follows: follows.map((item) => summarize(item, true)),
    };
}

export async function getMobileMediaCollections(userId: number, { mediaType, mediaId }: Params) {
    const { services, registries } = await getContainer();
    if (!registries.mediaService.get(mediaType).findById(mediaId)) throw notFound();
    return services.collections.getUserCollectionMemberships(userId, mediaId, mediaType);
}

export async function getMobileMediaEdit(userId: number, { mediaType, mediaId }: Params) {
    const { services, registries } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    if (!hasRequiredRole(toActor(user), RoleType.MANAGER)) throw new UnauthorizedError("restricted");
    const result = await registries.mediaService.get(mediaType).getMediaEditableFields(mediaId);
    const values: Record<string, unknown> = result.fields;
    return result.editableFields.map((key) => ({ key, value: key === "imageCover" ? "" : (values[key] ?? null) }));
}

export async function saveMobileMediaEdit(userId: number, input: z.infer<typeof editMediaDetailsSchema>) {
    const { services, registries } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    if (!hasRequiredRole(toActor(user), RoleType.MANAGER)) throw new UnauthorizedError("restricted");
    await registries.mediaService.get(input.mediaType).updateMediaEditableFields(input.mediaId, input.payload);
    return { kind: "saved" as const };
}

export async function refreshMobileMedia(userId: number, { mediaType, mediaId }: Params) {
    const { services } = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    return refreshCatalogMedia(toActor(user), mediaType, mediaId);
}
