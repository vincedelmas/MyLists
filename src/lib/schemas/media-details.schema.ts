import * as z from "zod";
import {JobType} from "@/lib/utils/enums";
import {requiredCoverImageSchema} from "@/lib/schemas/cover.schema";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, mediaTypeMediaIdSchema, paginationSchema} from "@/lib/schemas/common.schema";


export type EditMediaDetailsPayload = z.infer<typeof editMediaDetailsPayloadSchema>;


export const mediaDetailsSchema = mediaTypeMediaIdSchema;

export const mediaCommunityActivitySchema = mediaDetailsSchema.extend({
    search: paginationSchema,
});

export const externalMediaResolveSchema = z.object({
    apiId: z.coerce.string(),
    mediaType: mediaTypeFieldSchema,
});

export const refreshMediaDetailsSchema = mediaTypeMediaIdSchema;

export const mediaDetailsToEditSchema = mediaTypeMediaIdSchema;

export const editMediaDetailsPayloadSchema = z.record(z.string(), z.any());

export const editMediaDetailsSchema = mediaTypeMediaIdSchema.extend({
    payload: editMediaDetailsPayloadSchema,
});

export const updateBookCoverSchema = requiredCoverImageSchema.safeExtend({
    mediaId: coercedPositiveIntFieldSchema,
});


export const mediaDetailsJobSchema = z.object({
    name: z.string(),
    job: z.enum(JobType),
    mediaType: mediaTypeFieldSchema,
})


export const jobDetailsSchema = mediaDetailsJobSchema.extend({
    pagination: paginationSchema,
});
