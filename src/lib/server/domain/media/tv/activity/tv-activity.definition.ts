import {ActivityMediaDefinition} from "@/lib/server/domain/media/shared/activity/activity-media-definition";


export const tvActivityDefinition: ActivityMediaDefinition = {
    inputStep: 1,
    shortUnit: "eps",
    longUnit: "Episodes",
    toStoredValue: identity,
    toDisplayValue: identity,
    calculateTime: (specificGained, duration = 20) => specificGained * duration,
};


function identity(value: number) {
    return value;
}
