import {ActivityMediaDefinition} from "@/lib/server/domain/media/shared/activity/activity-media-definition";


export const movieActivityDefinition: ActivityMediaDefinition = {
    inputStep: 1,
    toStoredValue: identity,
    toDisplayValue: identity,
    calculateTime: (specificGained, duration = 100) => specificGained * duration,
};


function identity(value: number) {
    return value;
}
