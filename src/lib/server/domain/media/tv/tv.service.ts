import {pick} from "@/lib/utils/arrays-objects";
import {notFound} from "@tanstack/react-router";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {TvList, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {EpsSeasonPayload, RedoTvPayload, StatusPayload} from "@/lib/types/user-media.types";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export function createTvService(repository: TvRepository, definition: TvDefinition) {
    const { identity, service: servicePolicy } = definition;

    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);

    const service = createMediaService(repository, definition, {
        [UpdateType.REDO]: updateRedoHandler,
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

    function updateRedoHandler(currentState: TvList, payload: RedoTvPayload, media: TvType): [TvList, LogPayload] {
        const epsPerSeason = repository.getMediaEpsPerSeason(media.id);
        const currentRedo = Array.from({ length: epsPerSeason.length }, (_, index) => currentState.redo[index] ?? 0);
        const nextRedo = Array.from({ length: epsPerSeason.length }, (_, index) => payload.redo[index] ?? 0);

        const newState = { ...currentState, redo: nextRedo };

        const logPayload = {
            oldValue: currentRedo.reduce((a, b) => a + b, 0),
            newValue: nextRedo.reduce((a, b) => a + b, 0),
        };

        const redoDiff = nextRedo.map((val, i) => val - currentRedo[i]);
        const valuesToApply = redoDiff.reduce((sum, diff, i) => sum + diff * epsPerSeason[i].episodes, 0);
        newState.total = (currentState?.total ?? 0) + (valuesToApply ?? 0);

        return [newState, logPayload];
    }

    function updateStatusHandler(currentState: TvList, payload: StatusPayload, media: TvType): [TvList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const specialStatuses: Status[] = [Status.RANDOM, Status.PLAN_TO_WATCH];
        const epsPerSeason = repository.getMediaEpsPerSeason(media.id);
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (specialStatuses.includes(currentState.status) && !specialStatuses.includes(newState.status)) {
            newState.currentEpisode = 1;
        }

        if (payload.status === Status.COMPLETED) {
            const sumEpisodesTv = epsPerSeason.reduce((a, b) => a + b.episodes, 0);
            const sumOldRedoEps = currentState.redo.reduce((a, b, i) => a + b * (epsPerSeason[i]?.episodes ?? 0), 0);

            newState.total = sumEpisodesTv + sumOldRedoEps;
            newState.currentSeason = epsPerSeason.at(-1)!.season;
            newState.currentEpisode = epsPerSeason.at(-1)!.episodes;
        }
        else if (specialStatuses.includes(payload.status)) {
            newState.total = 0;
            newState.currentSeason = 1;
            newState.currentEpisode = 0;
            newState.redo = Array(epsPerSeason.length).fill(0);
        }

        return [newState, logPayload];
    }

    function updateEpsSeasonsHandler(currentState: TvList, payload: EpsSeasonPayload, media: TvType): [TvList, LogPayload] {
        const epsPerSeason = repository.getMediaEpsPerSeason(media.id);
        const epsPerSeasList = epsPerSeason.map((eps) => eps.episodes);

        if (payload.currentSeason) {
            if (payload.currentSeason > epsPerSeason.length) {
                throw new FormattedError("Invalid season number");
            }

            const newState = { ...currentState, currentSeason: payload.currentSeason };
            const logPayload = {
                oldValue: [currentState.currentSeason, currentState.currentEpisode],
                newValue: [payload.currentSeason, 1],
            }

            const newWatched = epsPerSeasList.slice(0, payload.currentSeason - 1).reduce((a, b) => a + b, 0) + 1;
            const newTotal = newWatched + currentState.redo.reduce((a, b, i) => a + b * (epsPerSeasList[i] ?? 0), 0);

            newState.total = newTotal
            newState.currentEpisode = 1;

            return [newState, logPayload] as [TvList, LogPayload];
        }

        if (payload.currentEpisode) {
            if (payload.currentEpisode > epsPerSeason[currentState.currentSeason - 1].episodes) {
                throw new FormattedError("Invalid episode");
            }

            const newState = { ...currentState, currentEpisode: payload.currentEpisode };
            const logPayload = {
                oldValue: [currentState.currentSeason, currentState.currentEpisode],
                newValue: [currentState.currentSeason, payload.currentEpisode],
            }

            const newWatched = epsPerSeasList
                .slice(0, currentState.currentSeason - 1)
                .reduce((a, b) => a + b, 0) + payload.currentEpisode;

            newState.total = newWatched + currentState.redo.reduce((a, b, i) => a + b * (epsPerSeasList[i] ?? 0), 0);

            return [newState, logPayload] as [TvList, LogPayload];
        }

        return [currentState, null];
    }

    return {
        ...service,
        updateRedoHandler,
        updateStatusHandler,
        getMediaEpsPerSeason,
        getMediaEditableFields,
        updateEpsSeasonsHandler,
        updateMediaEditableFields,
    };
}


export type TvService = ReturnType<typeof createTvService>;
