import {createSerializationAdapter} from "@tanstack/react-router";


type FormattedErrorArgs = {
    statusCode: number,
};


export class FormattedError extends Error {
    public args?: FormattedErrorArgs;

    constructor(message: string, args?: FormattedErrorArgs) {
        super(message);

        this.args = args;
        this.name = "FormattedError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FormattedError);
        }
    };
}


export const formattedErrorAdapter = createSerializationAdapter({
    key: "formatted-error",
    test: (v) => v instanceof FormattedError,
    toSerializable: ({ message }) => ({ message }),
    fromSerializable: ({ message }) => new FormattedError(message),
});


export class UnauthorizedError extends Error {
    public type: "restricted" | "private";

    constructor(type: "restricted" | "private") {
        super(type);

        this.type = type;
        this.name = "UnauthorizedError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UnauthorizedError);
        }
    };
}


export const unauthorizedErrorAdapter = createSerializationAdapter({
    key: "unauthorized-error",
    test: (v) => v instanceof UnauthorizedError,
    toSerializable: ({ type }) => ({ type }),
    fromSerializable: ({ type }) => new UnauthorizedError(type),
});


export class ValidationError<T extends object> extends Error {
    public readonly field: Extract<keyof T, string>;

    constructor(field: Extract<keyof T, string>, message: string) {
        super(message);

        this.field = field;
        this.name = "ValidationError";

        Object.setPrototypeOf(this, new.target.prototype);
    };
}


export const validationErrorAdapter = createSerializationAdapter({
    key: "validation-error",
    test: (v) => v instanceof ValidationError,
    toSerializable: ({ field, message }) => ({ field, message }),
    fromSerializable: ({ field, message }) => new ValidationError(field, message),
});
