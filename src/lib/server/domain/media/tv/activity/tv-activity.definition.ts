import {ActivityMediaDefinition} from "@/lib/types/activity.types";


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
