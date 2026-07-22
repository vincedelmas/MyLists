import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {Movie, MoviesList} from "@/lib/server/domain/media/movies/movies.types";
import {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {MovieDefinition, moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";


export class MoviesService extends BaseService<MovieDefinition, MoviesRepository> {
    constructor(repository: MoviesRepository, definition: MovieDefinition = moviesDefinition) {
        super(repository, definition);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
        }
    }

    async lockOldMovies() {
        return this.repository.lockOldMovies();
    }

    async findByTitleAndYear(title: string, year: number) {
        return this.repository.findByTitleAndYear(title, year);
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.avgMovieDuration(userId);
        const durationDistrib = await this.repository.movieDurationDistrib(userId);
        const { totalBudget, totalRevenue } = await this.repository.budgetRevenueStats(userId);
        const { directorsStats, actorsStats, langsStats } = await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            totalBudget,
            totalRevenue,
            avgDuration,
            durationDistrib,
            directorsStats,
            actorsStats,
            langsStats,
        };
    }

    async getMediaEditableFields(mediaId: number) {
        const { editableFields } = this.servicePolicy;

        const fields: Record<string, any> = {};
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        editableFields.forEach((field) => {
            if (field in media) {
                fields[field] = media[field as keyof typeof media];
            }
        });

        return { fields };
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const { editableFields } = this.servicePolicy;
        const { coverDirectory } = this.identity;

        const media = await this.repository.findById(mediaId);
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

        await this.repository.updateMediaWithDetails({ mediaData: fields });
    }

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
    };

    updateRedoHandler(currentState: MoviesList, payload: RedoPayload, _media: Movie): [MoviesList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = payload.redo + 1;

        return [newState, logPayload];
    };
}
