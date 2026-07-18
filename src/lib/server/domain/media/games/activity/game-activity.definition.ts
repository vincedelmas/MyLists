import {ActivityMediaDefinition} from "@/lib/types/activity.types";


export const gameActivityDefinition: ActivityMediaDefinition = {
    shortUnit: "h.",
    inputStep: 0.25,
    longUnit: "Hours Played",
    calculateTime: identity,
    toStoredValue: (hours) => hours * 60,
    toDisplayValue: (minutes) => Math.round((minutes / 60) * 100) / 100,
};


function identity(value: number) {
    return value;
}
