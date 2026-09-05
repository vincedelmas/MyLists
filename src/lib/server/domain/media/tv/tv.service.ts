import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {TvList, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {createBaseService} from "@/lib/server/domain/media/base/base.service";
import type {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {EpsSeasonPayload, RedoTvPayload, StatusPayload} from "@/lib/types/user-media.types";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export const createTvService = (repository: TvRepository, definition: TvDefinition) => {
    const { identity, service: servicePolicy } = definition;
    const handlers = {
        async updateRedoHandler(currentState: TvList, payload: RedoTvPayload, media: TvType): Promise<[TvList, LogPayload]> {
            const epsPerSeason = await repository.getMediaEpsPerSeason(media.id);
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
        },

        async updateStatusHandler(currentState: TvList, payload: StatusPayload, media: TvType): Promise<[TvList, LogPayload]> {
            const newState = { ...currentState, status: payload.status };
            const specialStatuses: Status[] = [Status.RANDOM, Status.PLAN_TO_WATCH];
            const epsPerSeason = await repository.getMediaEpsPerSeason(media.id);
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
        },

        async updateEpsSeasonsHandler(currentState: TvList, payload: EpsSeasonPayload, media: TvType): Promise<[TvList, LogPayload]> {
            const epsPerSeason = await repository.getMediaEpsPerSeason(media.id);
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
        },
    };

    return {
        ...createBaseService(repository, definition, {
            [UpdateType.REDO]: handlers.updateRedoHandler,
            [UpdateType.STATUS]: handlers.updateStatusHandler,
            [UpdateType.TV]: handlers.updateEpsSeasonsHandler,
        }),
        ...handlers,

        async getMediaEditableFields(mediaId: number) {
            const { editableFields } = servicePolicy;

            const fields: Record<string, any> = {};
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            editableFields.forEach((field) => {
                if (field in media) {
                    fields[field] = media[field as keyof typeof media];
                }
            });

            return { fields };
        },

        async getMediaEpsPerSeason(mediaId: number) {
            return repository.getMediaEpsPerSeason(mediaId);
        },

        async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
            const { editableFields } = servicePolicy;
            const { coverDirectory } = identity;

            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            type FieldsType = typeof editableFields[number];
            const fields: Partial<Record<FieldsType, any>> & { apiId: typeof media.apiId; } = { apiId: media.apiId };

            if (payload?.imageCover) {
                const imageName = await saveImageFromUrl({
                    dirSaveName: coverDirectory,
                    imageUrl: payload.imageCover,
                });
                fields.imageCover = imageName;
                delete payload.imageCover;
            }

            for (const key in payload) {
                if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as FieldsType)) {
                    fields[key as FieldsType] = payload[key];
                }
            }

            await repository.updateMediaWithDetails({ mediaData: fields as any });
        },
    };
};


export type TvService = ReturnType<typeof createTvService>;
