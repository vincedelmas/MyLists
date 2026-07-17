export const assertNever = (value: never, context: string): never => {
    throw new Error(`Unexpected ${context}: ${String(value)}`);
};
