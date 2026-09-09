import {pick} from "@/lib/utils/arrays-objects";
import {notFound} from "@tanstack/react-router";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {getTvSeasonTotals} from "@/lib/utils/media/tv-seasons";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {TvList, TvListUpdate, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {EpsSeasonPayload, RatingPayload, RedoTvPayload, StatusPayload} from "@/lib/types/user-media.types";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export function createTvService(repository: TvRepository, definition: TvDefinition) {
    const { identity, service: servicePolicy } = definition;

    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);

    const service = createMediaService(repository, definition, {
        [UpdateType.REDO]: updateRedoHandler,
        [UpdateType.RATING]: updateRatingHandler,
        [UpdateType.STATUS]: updateStatusHandler,
        [UpdateType.TV]: updateEpsSeasonsHandler,
    });

    async function getMediaEditableFields(mediaId: number) {
        const { editableFields } = servicePolicy;

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        return {
            editableFields,
            fields: pick(media, editableFields.filter(field => field !== "imageCover")),
        };
    }

    function getMediaEpsPerSeason(mediaId: number) {
        return repository.getMediaEpsPerSeason(mediaId);
    }

    async function downloadMediaListAsCSV(userId: number) {
        const rows = await repository.downloadMediaListAsCSV(userId);

        return rows.map(({ addedAt: _addedAt, lastUpdated: _lastUpdated, ...row }) => ({
            ...row,
            formatVersion: "2",
            mediaType: identity.mediaType,
            externalApiSource: definition.ingestion.externalApiSource,
        }));
    }

    async function updateMediaEditableFields(mediaId: number, payload: EditMediaDetailsPayloadByType[typeof MediaType.SERIES | typeof MediaType.ANIME]) {
        const { coverDirectory } = identity;
        payload = editPayloadSchema.parse(payload);

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const { imageCover, ...fields } = payload;
        const mediaData: Partial<TvType> & Pick<TvType, "apiId"> = { ...fields, apiId: media.apiId };

        if (imageCover) {
            mediaData.imageCover = await saveImageFromUrl({ dirSaveName: coverDirectory, imageUrl: imageCover });
        }

        withTransaction(() => repository.updateMediaWithDetails({ mediaData }));
    }

    function updateRatingHandler(currentState: TvList, payload: RatingPayload): [TvListUpdate, LogPayload] {
        const seasons = repository.getUserSeasons(currentState.userId, currentState.mediaId);

        const requested = "seasonRating" in payload
            ? [payload.seasonRating]
            : seasons.filter(season => season.episodes !== null || payload.rating === null)
                .map(season => ({ season: season.season, rating: payload.rating }));

        const nextSeasons = new Map(seasons.map(season => [season.season, season]));
        const seasonChanges: NonNullable<TvListUpdate["seasonChanges"]> = [];

        for (const change of requested) {
            const season = nextSeasons.get(change.season);
            if (!season) throw new FormattedError("Invalid season number");

            if (season.episodes === null && change.rating !== null) {
                throw new FormattedError("This season is no longer available. You can clear its rating.");
            }

            if (season.rating !== change.rating) {
                seasonChanges.push(change);
                nextSeasons.set(change.season, { ...season, rating: change.rating });
            }
        }

        const { rating } = getTvSeasonTotals([...nextSeasons.values()]);

        return [{ ...currentState, rating, seasonChanges }, null];
    }

    function updateRedoHandler(currentState: TvList, payload: RedoTvPayload): [TvListUpdate, LogPayload] {
        const seasons = repository.getUserSeasons(currentState.userId, currentState.mediaId);

        const oldTotals = getTvSeasonTotals(seasons);
        const nextSeasons = new Map(seasons.map(season => [season.season, season]));

        const seasonChanges: NonNullable<TvListUpdate["seasonChanges"]> = [];

        for (const change of payload.seasonRedos) {
            const season = nextSeasons.get(change.season);
            if (!season) throw new FormattedError("Invalid season number");

            if (season.episodes === null && change.redo !== 0) {
                throw new FormattedError("This season is no longer available. You can clear its rewatches.");
            }

            if (season.redo !== change.redo) {
                seasonChanges.push(change);
                nextSeasons.set(change.season, { ...season, redo: change.redo });
            }
        }

        const totals = getTvSeasonTotals([...nextSeasons.values()]);

        return [
            { ...currentState, seasonChanges, redo: totals.redo, total: currentState.total + totals.redoEpisodes - oldTotals.redoEpisodes },
            { oldValue: oldTotals.redo, newValue: totals.redo },
        ];
    }

    function updateStatusHandler(currentState: TvList, payload: StatusPayload, media: TvType): [TvListUpdate, LogPayload] {
        const newState: TvListUpdate = { ...currentState, status: payload.status };
        const specialStatuses: Status[] = [Status.RANDOM, Status.PLAN_TO_WATCH];

        const epsPerSeason = repository.getMediaEpsPerSeason(media.id);
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (specialStatuses.includes(currentState.status) && !specialStatuses.includes(newState.status)) {
            newState.currentSeason = epsPerSeason[0].season;
            newState.currentEpisode = 1;
            newState.total = 1;
        }

        if (payload.status === Status.COMPLETED) {
            const { redoEpisodes } = getTvSeasonTotals(repository.getUserSeasons(currentState.userId, media.id));
            newState.total = epsPerSeason.reduce((sum, season) => sum + season.episodes, 0) + redoEpisodes;

            newState.currentSeason = epsPerSeason.at(-1)!.season;
            newState.currentEpisode = epsPerSeason.at(-1)!.episodes;
        }
        else if (specialStatuses.includes(payload.status)) {
            newState.total = 0;
            newState.currentSeason = epsPerSeason[0].season;

            newState.redo = 0;
            newState.currentEpisode = 0;

            newState.seasonChanges = repository.getUserSeasons(currentState.userId, media.id)
                .filter(season => season.redo !== 0)
                .map(season => ({ season: season.season, redo: 0 }));
        }

        return [newState, logPayload];
    }

    function updateEpsSeasonsHandler(currentState: TvList, payload: EpsSeasonPayload, media: TvType): [TvList, LogPayload] {
        const seasons = repository.getMediaEpsPerSeason(media.id);
        const seasonNumber = payload.currentSeason ?? currentState.currentSeason;

        const season = seasons.find(season => season.season === seasonNumber);
        if (!season) throw new FormattedError("Invalid season number");

        const episode = payload.currentSeason !== undefined ? 1 : payload.currentEpisode!;
        if (episode > season.episodes) throw new FormattedError("Invalid episode");

        const watched = seasons
            .filter(season => season.season < seasonNumber)
            .reduce((sum, season) => sum + season.episodes, 0) + episode;

        const { redoEpisodes } = getTvSeasonTotals(repository.getUserSeasons(currentState.userId, media.id));

        return [
            { ...currentState, currentEpisode: episode, currentSeason: seasonNumber, total: watched + redoEpisodes },
            { oldValue: [currentState.currentSeason, currentState.currentEpisode], newValue: [seasonNumber, episode] },
        ];
    }

    return {
        ...service,
        updateRedoHandler,
        updateRatingHandler,
        updateStatusHandler,
        getMediaEpsPerSeason,
        getMediaEditableFields,
        downloadMediaListAsCSV,
        updateEpsSeasonsHandler,
        updateMediaEditableFields,
        getUserSeasons: repository.getUserSeasons,
        bulkInsertUserMedia: repository.bulkInsertUserMedia,
    };
}


export type TvService = ReturnType<typeof createTvService>;
