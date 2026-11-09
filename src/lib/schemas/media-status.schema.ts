import * as z from "zod";
import type {MediaType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";


export const mediaStatusSchema = (mediaType: MediaType) => {
    const allowedStatuses = getMediaDefinition(mediaType).statuses;

    return z.enum(allowedStatuses, {
        error: `Status is not valid for ${mediaType}. Allowed statuses are: ${allowedStatuses.join(", ")}`,
    });
};
