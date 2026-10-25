import * as z from "zod";
import { RoleType } from "@/lib/utils/enums";
import { notFound } from "@tanstack/react-router";
import { getContainer } from "@/lib/server/core/container";
import { mobileImagePath } from "@/lib/server/mobile/images";
import { calculateMediaLevel } from "@/lib/utils/media/level";
import { dateFromUTCInput } from "@/lib/utils/formatting/date";
import { InactiveMediaTypeError } from "@/lib/utils/error-classes";
import { toActor, hasRequiredRole } from "@/lib/server/authorization";
import { mediaListSearchSchema } from "@/lib/schemas/media-lists.schema";
import { getMediaDefinition } from "@/lib/media-definitions/definition.registry";
import { getMediaSortLabel } from "@/lib/utils/media/sorting";
import { isManualBookId } from "@/lib/media-definitions/books/book.definition.server";
import type { MediaListDataByType } from "@/lib/server/domain/media/media-list.types";
import { getMediaRefreshAvailability } from "@/lib/server/domain/media/media-refresh";
import { getServerMediaDefinition } from "@/lib/media-definitions/definition.registry.server";
import { addMediaToListSchema, updateUserMediaSchema } from "@/lib/schemas/user-media.schema";
import { mediaTypeFieldSchema, coercedPositiveIntFieldSchema } from "@/lib/schemas/common.schema";
import { ActivityCorrectionRequired } from "@/lib/server/domain/tracking/monthly-activity.service";

export const mediaParamsSchema = z.object({ mediaType: mediaTypeFieldSchema, mediaId: coercedPositiveIntFieldSchema });

// Never accept the web list's identity or pagination-size overrides from a mobile client.
export const listInputSchema = mediaListSearchSchema.omit({
    perPage: true,
    userId: true,
    currentUserId: true,
    view: true,
    filtersTab: true,
});

export const getMobileList = async (
    userId: number,
    mediaType: z.infer<typeof mediaTypeFieldSchema>,
    input: z.infer<typeof listInputSchema>,
    viewerId = userId,
) => {
    const container = await getContainer();
    const definition = getMediaDefinition(mediaType);
    const user = await container.services.account.getUserById(userId);

    if (!user?.userMediaSettings.some((setting) => setting.active && setting.mediaType === mediaType)) {
        throw new InactiveMediaTypeError(mediaType);
    }

    const status = input.status ? z.array(z.enum(definition.statuses)).parse(input.status) : undefined;
    const sortKey = z.enum(definition.sorting.options).parse(input.sorting ?? definition.sorting.default);
    const result = (await container.registries.mediaService.get(mediaType).getMediaList(viewerId, userId, {
        ...input,
        sorting: getMediaSortLabel(definition, sortKey),
        perPage: 30,
        favorite: input.favorite,
        status,
    })) as MediaListDataByType[typeof mediaType];

    return {
        pagination: result.pagination,
        statuses: definition.statuses,
        ratingSystem: user.ratingSystem,
        items: result.items.map((item) => ({
            status: item.status,
            rating: item.rating,
            name: item.mediaName,
            mediaId: item.mediaId,
            favorite: item.favorite,
            hasComment: Boolean(item.comment),
            cover: mobileImagePath(item.imageCover),
        })),
    };
};

export const getMobileMedia = async (userId: number, params: z.infer<typeof mediaParamsSchema>) => {
    const container = await getContainer();
    const definition = getMediaDefinition(params.mediaType);
    const service = container.registries.mediaService.get(params.mediaType);

    const media = service.findById(params.mediaId);
    if (!media) throw notFound();

    const userMedia = service.findUserMedia(userId, params.mediaId) as Awaited<
        ReturnType<typeof service.getMediaAndUserDetails>
    >["userMedia"];
    const settings = await container.services.account.getUserById(userId);

    const compatiblePlatforms =
        params.mediaType === "games"
            ? await container.registries.mediaService.get("games").getCompatiblePlatforms(params.mediaId)
            : [];

    const labels = {
        pages: "Pages",
        voteCount: "Votes",
        volumes: "Volumes",
        endDate: "End date",
        language: "Language",
        chapters: "Chapters",
        publishers: "Publisher",
        createdBy: "Created by",
        gameModes: "Game modes",
        totalSeasons: "Seasons",
        originCountry: "Country",
        directorName: "Director",
        totalEpisodes: "Episodes",
        gameEngine: "Game engine",
        compositorName: "Composer",
        voteAverage: "Provider score",
        duration: "Runtime (minutes)",
        originalName: "Original title",
        prodStatus: "Production status",
        playerPerspective: "Perspective",
        hltbMainTime: "Main story (hours)",
        originalLanguage: "Original language",
        hltbMainAndExtraTime: "Main + extras (hours)",
        hltbTotalCompleteTime: "Completionist (hours)",
    };

    const fields: Record<string, unknown> = media;

    const facts = Object.entries(labels).flatMap(([key, label]) => {
        const value = fields[key];
        return value === null || value === undefined || value === "" ? [] : [{ label, value: String(value) }];
    });

    const serverDefinition = getServerMediaDefinition(params.mediaType);
    const { attribution } = serverDefinition;

    const providerUrl =
        params.mediaType === "books" && isManualBookId(String(media.apiId))
            ? null
            : "igdbUrl" in media
              ? media.igdbUrl
              : "mediaUrl" in attribution
                ? `${attribution.mediaUrl}${media.apiId}`
                : null;

    const backdrop =
        "backdropPath" in media && media.backdropPath
            ? `https://image.tmdb.org/t/p/w1280${media.backdropPath}`
            : "backdropImageId" in media && media.backdropImageId
              ? `https://images.igdb.com/igdb/image/upload/t_1080p/${media.backdropImageId}.jpg`
              : null;

    const actor = toActor(settings!);

    return {
        compatiblePlatforms,
        statuses: definition.statuses,
        progress: definition.progress,
        ratingSystem: settings!.ratingSystem,
        canEdit: hasRequiredRole(actor, RoleType.MANAGER),
        refresh: getMediaRefreshAvailability(actor, params.mediaType, media),
        active:
            settings?.userMediaSettings.some((setting) => setting.mediaType === params.mediaType && setting.active) ??
            false,
        seasons:
            params.mediaType === "series" || params.mediaType === "anime"
                ? container.registries.mediaService.get(params.mediaType).getUserSeasons(userId, params.mediaId)
                : null,
        media: {
            facts,
            backdrop,
            id: media.id,
            name: media.name,
            synopsis: media.synopsis,
            releaseDate: media.releaseDate,
            tagline: "tagline" in media ? media.tagline : null,
            scoreDivisor: params.mediaType === "games" ? 10 : 1,
            votes: "voteCount" in media ? media.voteCount : null,
            duration: "duration" in media ? media.duration : null,
            provider: { name: attribution.name, url: providerUrl },
            score: "voteAverage" in media ? media.voteAverage : null,
            cover: mobileImagePath(userMedia?.customCover ?? media.imageCover),
            completionHours: "hltbMainTime" in media ? media.hltbMainTime : null,
            nextEpisode:
                "nextEpisodeToAir" in media
                    ? { date: media.nextEpisodeToAir, season: media.seasonToAir, episode: media.episodeToAir }
                    : null,
            byline:
                "directorName" in media
                    ? media.directorName
                    : "createdBy" in media
                      ? media.createdBy
                      : "publishers" in media
                        ? media.publishers
                        : null,
        },
        tracking: userMedia
            ? {
                  ...userMedia,
                  customCover: userMedia.customCover ? mobileImagePath(userMedia.customCover) : null,
                  addedAt: userMedia.addedAt ? dateFromUTCInput(userMedia.addedAt).toISOString() : null,
                  lastUpdated: userMedia.lastUpdated ? dateFromUTCInput(userMedia.lastUpdated).toISOString() : null,
              }
            : null,
    };
};

export const addMobileMedia = async (userId: number, input: z.infer<typeof addMediaToListSchema>) => {
    const { services } = await getContainer();
    services.mediaTracking.addMediaToList({ ...input, userId });

    return { kind: "saved" as const };
};

export const updateMobileMedia = async (userId: number, input: z.infer<typeof updateUserMediaSchema>) => {
    const { services } = await getContainer();

    try {
        services.mediaTracking.updateUserMedia({ ...input, userId });
        return { kind: "saved" as const };
    } catch (error) {
        if (error instanceof ActivityCorrectionRequired)
            return { kind: "correction-required" as const, preview: error.preview };
        throw error;
    }
};

export const removeMobileMedia = async (userId: number, params: z.infer<typeof mediaParamsSchema>) => {
    const { services } = await getContainer();
    services.mediaTracking.removeMediaFromList({ ...params, userId });

    return { kind: "saved" as const };
};

export const getMobileLists = async (userId: number) => {
    const { services } = await getContainer();

    const user = await services.account.getUserById(userId);
    if (!user) return null;

    return user.userMediaSettings
        .filter((item) => item.active)
        .map(({ mediaType, totalEntries, entriesFavorites, timeSpent }) => ({
            mediaType,
            totalEntries,
            entriesFavorites,
            timeSpent: timeSpent / 60,
            level: calculateMediaLevel(timeSpent),
        }));
};
