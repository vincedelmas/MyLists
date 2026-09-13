import {FormattedError} from "@/lib/utils/error-classes";


export type ProviderErrorDetails = {
    provider: string;
    statusCode: number;
    kind: "quota" | "rate_limit" | "unavailable" | "access";
    retryAt?: number;
    reason?: string;
    quotaLimit?: string;
};


export class ProviderRequestError extends FormattedError {
    constructor(message: string, public readonly details: ProviderErrorDetails) {
        super(message, { statusCode: details.statusCode });
        this.name = "ProviderRequestError";
    }
}
