import React from "react";
import {Skull} from "lucide-react";
import {UnauthorizedError} from "@/lib/utils/error-classes";
import {type ErrorComponentProps} from "@tanstack/react-router";
import {ErrorComponent} from "@/lib/client/components/general/ErrorComponent";
import {UnauthorizedComponent} from "@/lib/client/components/general/UnauthorizedComponent";


export function ErrorCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
    if (error instanceof UnauthorizedError) {
        return (
            <div className="py-20">
                <UnauthorizedComponent
                    type={error.type}
                />
            </div>
        );
    }

    const message = getErrorMessage(error);
    const statusCode = getStatusCode(error);
    const upstreamFailure = isUpstreamFailure(message, statusCode);

    if (!message) {
        return (
            <ErrorComponent
                title="Well, This is Awkward"
                icon={<Skull className="size-9"/>}
                footerText="If this keeps happening, we probably broke something important."
                text="Sorry, it looks like something isn't working right now. Please try refreshing the page or come back later."
            />
        );
    }

    return (
        <ErrorComponent
            footerText="If this keeps happening, we probably broke something important."
            title={upstreamFailure ? "App Temporarily Unavailable" : "An Error Occurred"}
            text={upstreamFailure ? "Sorry, the app is temporarily unavailable. Please refresh the page or try again in a few minutes." : message}
        />
    );
}


function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error === "object" && "message" in error) {
        const message = error.message;
        if (typeof message === "string") {
            return message;
        }
    }

    return "";
}


function getStatusCode(error: unknown) {
    const candidates = [
        readNumericField(error, "status"),
        readNumericField(error, "statusCode"),
        readNestedNumericField(error, "cause", "status"),
        readNestedNumericField(error, "cause", "statusCode"),
    ];

    return candidates.find((value) => typeof value === "number");
}


function readNumericField(value: unknown, key: string) {
    if (!value || typeof value !== "object" || !(key in value)) {
        return undefined;
    }

    const candidate = value[key as keyof typeof value];
    return typeof candidate === "number" ? candidate : undefined;
}


function readNestedNumericField(value: unknown, parentKey: string, childKey: string) {
    if (!value || typeof value !== "object" || !(parentKey in value)) {
        return undefined;
    }

    const parentValue = value[parentKey as keyof typeof value];
    return readNumericField(parentValue, childKey);
}


function isUpstreamFailure(message: string, statusCode?: number) {
    if ([502, 503, 504].includes(statusCode ?? 0)) {
        return true;
    }

    return (
        /<(?:!doctype|html|head|body|title|div|p|style)\b/i.test(message) ||
        /(?:502|503|504)\s+(?:bad gateway|service unavailable|gateway time-?out)/i.test(message) ||
        /bad gateway|service unavailable|gateway time-?out|upstream|nginx|failed to fetch|fetch failed|networkerror/i.test(message)
    );
}
