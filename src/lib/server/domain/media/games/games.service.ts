import {pick} from "@/lib/utils/arrays-objects";
import {notFound} from "@tanstack/react-router";
import {LogPayload} from "@/lib/types/user-updates.types";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {Game, GamesList} from "@/lib/server/domain/media/games/games.types";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {AchievementsPayload, PlaytimePayload, StatusPayload} from "@/lib/types/user-media.types";
import {createMediaService, createSimpleUpdateHandler} from "@/lib/server/domain/media/base/media.service";
import {gamesServerDefinition, GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";


export function createGamesService(repository: GamesRepository, definition: GamesServerDefinition = gamesServerDefinition) {
    const { identity, service: servicePolicy } = definition;
    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);

    const service = createMediaService(repository, definition, {
        [UpdateType.STATUS]: updateStatusHandler,
        [UpdateType.PLAYTIME]: updatePlaytimeHandler,
        [UpdateType.ACHIEVEMENTS]: updateAchievementsHandler,
        [UpdateType.PLATFORM]: createSimpleUpdateHandler("platform"),
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

    async function getCompatiblePlatforms(mediaId: number) {
        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        return repository.getCompatiblePlatforms(mediaId);
    }

    async function updateMediaEditableFields(mediaId: number, payload: EditMediaDetailsPayloadByType[typeof MediaType.GAMES]) {
        const { coverDirectory } = identity;
        payload = editPayloadSchema.parse(payload);

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const { imageCover, ...fields } = payload;
        const mediaData: Partial<Game> & Pick<Game, "apiId"> = { ...fields, apiId: media.apiId };

        if (imageCover) {
            mediaData.imageCover = await saveImageFromUrl({ dirSaveName: coverDirectory, imageUrl: imageCover });
        }

        withTransaction(() => repository.updateMediaWithDetails({ mediaData }));
    }

    function updateStatusHandler(currentState: GamesList, payload: StatusPayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.PLANNED) {
            newState.playtime = 0;
            newState.achievementsTotal = null;
            newState.achievementsUnlocked = null;
        }

        return [newState, logPayload];
    }

    function updatePlaytimeHandler(currentState: GamesList, payload: PlaytimePayload, _media: Game): [GamesList, LogPayload] {
        const newState = { ...currentState, playtime: payload.playtime };
        const logPayload = { oldValue: currentState.playtime, newValue: payload.playtime };

        return [newState, logPayload];
    }

    function updateAchievementsHandler(currentState: GamesList, payload: AchievementsPayload, _media: Game): [GamesList, LogPayload] {
        const newState = {
            ...currentState,
            achievementsTotal: payload.achievementsTotal,
            achievementsUnlocked: payload.achievementsUnlocked,
        };

        return [newState, null];
    }

    return {
        ...service,
        updateStatusHandler,
        updatePlaytimeHandler,
        getMediaEditableFields,
        getCompatiblePlatforms,
        updateMediaEditableFields,
        updateAchievementsHandler,
    };
}


export type GamesService = ReturnType<typeof createGamesService>;
