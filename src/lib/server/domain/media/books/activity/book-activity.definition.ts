import {ActivityMediaDefinition} from "@/lib/server/domain/media/shared/activity/activity-media-definition";


export const bookActivityDefinition: ActivityMediaDefinition = {
    inputStep: 1,
    shortUnit: "p.",
    longUnit: "Pages Read",
    toStoredValue: identity,
    toDisplayValue: identity,
    calculateTime: (specificGained) => specificGained * 1.7,
};


function identity(value: number) {
    return value;
}
