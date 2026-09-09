import {notFound} from "@tanstack/react-router";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {Movie, MoviesList} from "@/lib/server/domain/media/movies/movies.types";
import {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";
import {MovieServerDefinition, moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {pick} from "@/lib/utils/arrays-objects";


export function createMoviesService(repository: MoviesRepository, definition: MovieServerDefinition = moviesServerDefinition) {
    const { identity, service: servicePolicy } = definition;
    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);
    const service = createMediaService(repository, definition, {
        [UpdateType.REDO]: updateRedoHandler,
        [UpdateType.STATUS]: updateStatusHandler,
    });

    async function lockOldMovies() {
        return repository.lockOldMovies();
    }

    async function findByTitleAndYear(title: string, year: number) {
        return repository.findByTitleAndYear(title, year);
    }

    async function getMediaEditableFields(mediaId: number) {
        const { editableFields } = servicePolicy;

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        return {
            editableFields,
            fields: pick(media, editableFields.filter(field => field !== "imageCover")),
        };
    }

    async function updateMediaEditableFields(mediaId: number, payload: EditMediaDetailsPayloadByType[typeof MediaType.MOVIES]) {
        const { coverDirectory } = identity;
        payload = editPayloadSchema.parse(payload);

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const { imageCover, ...fields } = payload;
        const mediaData: Partial<Movie> & Pick<Movie, "apiId"> = { ...fields, apiId: media.apiId };

        if (imageCover) {
            mediaData.imageCover = await saveImageFromUrl({ dirSaveName: coverDirectory, imageUrl: imageCover });
        }

        withTransaction(() => repository.updateMediaWithDetails({ mediaData }));
    }

    function updateStatusHandler(currentState: MoviesList, payload: StatusPayload, _media: Movie): [MoviesList, LogPayload] {
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
    }

    function updateRedoHandler(currentState: MoviesList, payload: RedoPayload, _media: Movie): [MoviesList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = payload.redo + 1;

        return [newState, logPayload];
    }

    return {
        ...service,
        lockOldMovies,
        findByTitleAndYear,
        getMediaEditableFields,
        updateMediaEditableFields,
        updateStatusHandler,
        updateRedoHandler,
    };
}


export type MoviesService = ReturnType<typeof createMoviesService>;
