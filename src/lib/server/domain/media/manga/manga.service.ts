import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {uniqueBy} from "@/lib/utils/arrays";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {createBaseService} from "@/lib/server/domain/media/base/base.service";
import {Manga, MangaList} from "@/lib/server/domain/media/manga/manga.types";
import type {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {ChapterPayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export const createMangaService = (repository: MangaRepository, definition: MangaServerDefinition = mangaServerDefinition) => {
    const { identity, service: servicePolicy } = definition;
    const handlers = {
        updateRedoHandler(currentState: MangaList, payload: RedoPayload, media: Manga): [MangaList, LogPayload] {
            if (!media.chapters) {
                throw new FormattedError("Cannot redo a manga without chapters");
            }

            const newState = { ...currentState, redo: payload.redo };
            const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

            newState.total = media.chapters + (payload.redo * media.chapters);

            return [newState, logPayload];
        },

        updateStatusHandler(currentState: MangaList, payload: StatusPayload, media: Manga): [MangaList, LogPayload] {
            const newState = { ...currentState, status: payload.status };
            const logPayload = { oldValue: currentState.status, newValue: payload.status };

            if (payload.status === Status.COMPLETED) {
                if (media.chapters) {
                    newState.total = media.chapters;
                    newState.currentChapter = media.chapters;
                }
            }
            else if (payload.status === Status.PLAN_TO_READ) {
                newState.redo = 0;
                newState.total = 0;
                newState.currentChapter = 0;
            }

            return [newState, logPayload];
        },

        updateChapterHandler(currentState: MangaList, payload: ChapterPayload, media: Manga): [MangaList, LogPayload] {
            const newState = { ...currentState, currentChapter: payload.currentChapter };
            const logPayload = { oldValue: currentState.currentChapter, newValue: payload.currentChapter };

            newState.total = payload.currentChapter + (currentState.redo * (media.chapters ?? 0));

            return [newState, logPayload];
        },
    };

    return {
        ...createBaseService(repository, definition, {
            [UpdateType.REDO]: handlers.updateRedoHandler,
            [UpdateType.STATUS]: handlers.updateStatusHandler,
            [UpdateType.CHAPTER]: handlers.updateChapterHandler,
        }),
        ...handlers,

        async getMediaEditableFields(mediaId: number) {
            const { editableFields } = servicePolicy;

            const fields: Record<string, any> = {};
            const media = await repository.findAllAssociatedDetails(mediaId);
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

            const { genres, ...mediaData } = payload;

            if (genres && !Array.isArray(genres)) {
                throw new Error("Genres must be an array");
            }

            const fieldsToUpdate = {} as Record<Partial<keyof Manga>, any>;
            fieldsToUpdate.apiId = media.apiId;

            if (mediaData?.imageCover) {
                const imageName = await saveImageFromUrl({
                    dirSaveName: coverDirectory,
                    imageUrl: mediaData.imageCover,
                });
                fieldsToUpdate.imageCover = imageName;
                delete mediaData.imageCover;
            }

            for (const key in mediaData) {
                if (Object.prototype.hasOwnProperty.call(mediaData, key) && editableFields.includes(key as keyof Manga)) {
                    fieldsToUpdate[key as keyof typeof media] = mediaData[key as keyof typeof media];
                }
            }

            const genresData = Array.isArray(genres)
                ? uniqueBy(
                    genres.map((genre) => typeof genre === "string" ? { name: genre } : genre),
                    (genre) => genre.name,
                )
                : genres;

            await repository.updateMediaWithDetails({ mediaData: fieldsToUpdate, genresData });
        },
    };
};


export type MangaService = ReturnType<typeof createMangaService>;
