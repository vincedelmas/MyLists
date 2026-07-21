import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Game, GamesList} from "@/lib/server/domain/media/games/games.types";
import {PlaytimePayload, StatusPayload} from "@/lib/types/user-media.types";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {gamesDefinition, type GamesDefinition} from "@/lib/server/domain/media/games/games.definition";


export class GamesService extends BaseService<GamesDefinition, GamesRepository> {
    constructor(repository: GamesRepository, policy: GamesDefinition["service"] = gamesDefinition.service) {
        super(repository, policy);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
            [UpdateType.PLAYTIME]: this.updatePlaytimeHandler.bind(this),
            [UpdateType.PLATFORM]: this.createSimpleUpdateHandler("platform"),
        };
    }

    async calculateAdvancedMediaStats(mediaAvgRating: number | null, userId?: number) {
        // If userId not provided, calculations are platform-wide

        const { ratings, genresStats, totalTags, releaseDates } = await super.calculateAdvancedMediaStats(mediaAvgRating, userId);

        // Specific stats
        const avgDuration = await this.repository.gameAvgPlaytime(userId);
        const durationDistrib = await this.repository.gamePlaytimeDistrib(userId);

        const { developersStats, publishersStats, platformsStats, enginesStats, perspectivesStats } =
            await this.repository.specificTopMetrics(mediaAvgRating, userId);

        return {
            ratings,
            totalTags,
            genresStats,
            releaseDates,
            avgDuration,
            durationDistrib,
            developersStats,
            publishersStats,
            platformsStats,
            enginesStats,
            perspectivesStats,
        };
    }

    async getMediaEditableFields(mediaId: number) {
        const { editableFields } = this.policy;

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

    async getCompatiblePlatforms(mediaId: number) {
        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        return this.repository.getCompatiblePlatforms(mediaId);
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const { editableFields, coverDirectory } = this.policy;

        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const fields = {} as Record<Partial<keyof Game>, any>;
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
            if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as keyof Game)) {
                fields[key as keyof typeof media] = payload[key as keyof typeof media];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fields });
    }

    updateStatusHandler(currentState: GamesList, payload: StatusPayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.PLAN_TO_PLAY) {
            newState.playtime = 0;
        }

        return [newState, logPayload];
    };

    updatePlaytimeHandler(currentState: GamesList, payload: PlaytimePayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, playtime: payload.playtime };
        const logPayload = { oldValue: currentState.playtime, newValue: payload.playtime };

        return [newState, logPayload];
    };
}
