import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {LogPayload} from "@/lib/types/user-updates.types";
import {createSimpleUpdateHandler} from "@/lib/utils/media-update-handlers";
import {createBaseService} from "@/lib/server/domain/media/base/base.service";
import {Game, GamesList} from "@/lib/server/domain/media/games/games.types";
import {PlaytimePayload, StatusPayload} from "@/lib/types/user-media.types";
import type {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {gamesServerDefinition, GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";


export const createGamesService = (repository: GamesRepository, definition: GamesServerDefinition = gamesServerDefinition) => {
    const { identity, service: servicePolicy } = definition;
    const handlers = {
        updateStatusHandler(currentState: GamesList, payload: StatusPayload, _media: Game): [GamesList, LogPayload] {
            const newState = { ...currentState, status: payload.status };
            const logPayload = { oldValue: currentState.status, newValue: payload.status };

            if (payload.status === Status.PLAN_TO_PLAY) {
                newState.playtime = 0;
            }

            return [newState, logPayload];
        },

        updatePlaytimeHandler(currentState: GamesList, payload: PlaytimePayload, _media: Game): [GamesList, LogPayload] {
            const newState = { ...currentState, playtime: payload.playtime };
            const logPayload = { oldValue: currentState.playtime, newValue: payload.playtime };

            return [newState, logPayload];
        },
    };

    return {
        ...createBaseService(repository, definition, {
            [UpdateType.STATUS]: handlers.updateStatusHandler,
            [UpdateType.PLAYTIME]: handlers.updatePlaytimeHandler,
            [UpdateType.PLATFORM]: createSimpleUpdateHandler("platform"),
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

        async getCompatiblePlatforms(mediaId: number) {
            const media = await repository.findById(mediaId);
            if (!media) throw notFound();

            return repository.getCompatiblePlatforms(mediaId);
        },

        async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
            const { editableFields } = servicePolicy;
            const { coverDirectory } = identity;

            const media = await repository.findById(mediaId);
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

            await repository.updateMediaWithDetails({ mediaData: fields });
        },
    };
};


export type GamesService = ReturnType<typeof createGamesService>;
