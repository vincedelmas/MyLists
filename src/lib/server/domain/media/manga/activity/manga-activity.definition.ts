import {ActivityMediaDefinition} from "@/lib/server/domain/media/shared/activity/activity-media-definition";


export const mangaActivityDefinition: ActivityMediaDefinition = {
    inputStep: 1,
    shortUnit: "ch.",
    longUnit: "Chapters Read",
    toStoredValue: identity,
    toDisplayValue: identity,
    calculateTime: (specificGained) => specificGained * 7,
};


function identity(value: number) {
    return value;
}
