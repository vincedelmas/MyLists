import {pick, uniqueBy} from "@/lib/utils/arrays-objects";
import {notFound} from "@tanstack/react-router";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {Manga, MangaList} from "@/lib/server/domain/media/manga/manga.types";
import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";
import {ChapterPayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export function createMangaService(repository: MangaRepository, definition: MangaServerDefinition = mangaServerDefinition) {
    const { identity, service: servicePolicy } = definition;
    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);
    const service = createMediaService(repository, definition, {
        [UpdateType.REDO]: updateRedoHandler,
        [UpdateType.STATUS]: updateStatusHandler,
        [UpdateType.CHAPTER]: updateChapterHandler,
    });

    async function getMediaEditableFields(mediaId: number) {
        const { editableFields } = servicePolicy;

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        return {
            editableFields,
            fields: pick(media, editableFields.filter(field => field !== "imageCover" && field !== "genres")),
        };
    }

    async function updateMediaEditableFields(mediaId: number, payload: EditMediaDetailsPayloadByType[typeof MediaType.MANGA]) {
        const { coverDirectory } = identity;
        payload = editPayloadSchema.parse(payload);

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const { imageCover, genres, ...fields } = payload;
        const mediaData: Partial<Manga> & Pick<Manga, "apiId"> = { ...fields, apiId: media.apiId };

        if (imageCover) {
            mediaData.imageCover = await saveImageFromUrl({ dirSaveName: coverDirectory, imageUrl: imageCover });
        }

        const genresData = genres === undefined
            ? undefined
            : uniqueBy(genres.map(genre => typeof genre === "string" ? { name: genre } : genre), (genre) => genre.name);

        withTransaction(() => repository.updateMediaWithDetails({ mediaData, genresData }));
    }

    function updateRedoHandler(currentState: MangaList, payload: RedoPayload, media: Manga): [MangaList, LogPayload] {
        if (!media.chapters) {
            throw new FormattedError("Cannot redo a manga without chapters");
        }

        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = media.chapters + (payload.redo * media.chapters);

        return [newState, logPayload];
    }

    function updateStatusHandler(currentState: MangaList, payload: StatusPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.COMPLETED) {
            if (media.chapters) {
                newState.total = media.chapters + (currentState.redo * media.chapters);
                newState.currentChapter = media.chapters;
            }
        }
        else if (payload.status === Status.PLAN_TO_READ) {
            newState.redo = 0;
            newState.total = 0;
            newState.currentChapter = 0;
        }

        return [newState, logPayload];
    }

    function updateChapterHandler(currentState: MangaList, payload: ChapterPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, currentChapter: payload.currentChapter };
        const logPayload = { oldValue: currentState.currentChapter, newValue: payload.currentChapter };

        newState.total = payload.currentChapter + (currentState.redo * (media.chapters ?? 0));

        return [newState, logPayload];
    }

    return {
        ...service,
        getMediaEditableFields,
        updateMediaEditableFields,
        updateRedoHandler,
        updateStatusHandler,
        updateChapterHandler,
    };
}


export type MangaService = ReturnType<typeof createMangaService>;
