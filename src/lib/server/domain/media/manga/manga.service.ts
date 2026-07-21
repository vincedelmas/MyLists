import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Manga, MangaList} from "@/lib/server/domain/media/manga/manga.types";
import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {ChapterPayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {mangaDefinition, MangaDefinition} from "@/lib/server/domain/media/manga/manga.definition";


export class MangaService extends BaseService<MangaDefinition, MangaRepository> {
    constructor(repository: MangaRepository, policy: MangaDefinition["service"] = mangaDefinition.service) {
        super(repository, policy);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
            [UpdateType.CHAPTER]: this.updateChapterHandler.bind(this),
        }
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.avgMangaDuration(userId);
        const durationDistrib = await this.repository.mangaDurationDistrib(userId);
        const { publishersStats, authorsStats } = await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            publishersStats,
            authorsStats,
        };
    }

    async getMediaEditableFields(mediaId: number) {
        const { editableFields } = this.policy;

        const fields: Record<string, any> = {};
        const media = await this.repository.findAllAssociatedDetails(mediaId);
        if (!media) throw notFound();

        editableFields.forEach((field) => {
            if (field in media) {
                fields[field] = media[field as keyof typeof media];
            }
        });

        return { fields };
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const { editableFields, coverDirectory } = this.policy;

        const media = await this.repository.findById(mediaId);
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

        await this.repository.updateMediaWithDetails({ mediaData: fieldsToUpdate, genresData: genres });
    }

    updateRedoHandler(currentState: MangaList, payload: RedoPayload, media: Manga): [MangaList, LogPayload] {
        if (!media.chapters) {
            throw new FormattedError("Cannot redo a manga without chapters");
        }

        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = media.chapters + (payload.redo * media.chapters);

        return [newState, logPayload];
    }

    updateStatusHandler(currentState: MangaList, payload: StatusPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.COMPLETED) {
            if (!media.chapters) {
                throw new FormattedError("Cannot complete a manga without chapters");
            }

            newState.total = media.chapters;
            newState.currentChapter = media.chapters;
        }
        else if (payload.status === Status.PLAN_TO_READ) {
            newState.redo = 0;
            newState.total = 0;
            newState.currentChapter = 0;
        }

        return [newState, logPayload];
    }

    updateChapterHandler(currentState: MangaList, payload: ChapterPayload, media: Manga): [MangaList, LogPayload] {
        const newState = { ...currentState, currentChapter: payload.currentChapter };
        const logPayload = { oldValue: currentState.currentChapter, newValue: payload.currentChapter };

        newState.total = payload.currentChapter + (currentState.redo * (media.chapters ?? 0));

        return [newState, logPayload];
    }
}
