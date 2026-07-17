export type ActivityMediaDefinition = {
    longUnit?: string;
    inputStep: number;
    shortUnit?: string;
    toStoredValue: (value: number) => number;
    toDisplayValue: (value: number) => number;
    calculateTime: (specificGained: number, duration?: number) => number;
};
