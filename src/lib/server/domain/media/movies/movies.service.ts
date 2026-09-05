import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {createBaseService} from "@/lib/server/domain/media/base/base.service";
import {RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {Movie, MoviesList} from "@/lib/server/domain/media/movies/movies.types";
import type {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {MovieServerDefinition, moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";


export const createMoviesService = (repository: MoviesRepository, definition: MovieServerDefinition = moviesServerDefinition) => {
    const { identity, service: servicePolicy } = definition;
    const handlers = {
        updateStatusHandler(currentState: MoviesList, payload: StatusPayload, _media: Movie): [MoviesList, LogPayload] {
            const newState = { ...currentState, status: payload.status };
            const logPayload = { oldValue: currentState.status, newValue: payload.status };

            newState.redo = 0;
            if (payload.status === Status.COMPLETED) {
                newState.total = 1;
            }
            else {
                newState.total = 0;
            }

            return [newState, logPayload];
        },

        updateRedoHandler(currentState: MoviesList, payload: RedoPayload, _media: Movie): [MoviesList, LogPayload] {
            const newState = { ...currentState, redo: payload.redo };
            const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

            newState.total = payload.redo + 1;

            return [newState, logPayload];
        },
    };

    return {
        ...createBaseService(repository, definition, {
            [UpdateType.REDO]: handlers.updateRedoHandler,
            [UpdateType.STATUS]: handlers.updateStatusHandler,
        }),
        ...handlers,

        async lockOldMovies() {
            return repository.lockOldMovies();
        },

        async findByTitleAndYear(title: string, year: number) {
            return repository.findByTitleAndYear(title, year);
        },

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

        async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
            const { editableFields } = servicePolicy;
            const { coverDirectory } = identity;

            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            const fields = {} as Record<Partial<keyof Movie>, any>;
            fields.apiId = media.apiId;

            if (payload?.imageCover) {
                const imageName = await saveImageFromUrl({
                    dirSaveName: coverDirectory,
                    imageUrl: payload.imageCover,
                });
                fields.imageCover = imageName;
                delete payload.imageCover;
            }

            for (const key in payload) {
                if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as keyof Movie)) {
                    fields[key as keyof typeof media] = payload[key as keyof typeof media];
                }
            }

            await repository.updateMediaWithDetails({ mediaData: fields });
        },
    };
};


export type MoviesService = ReturnType<typeof createMoviesService>;
