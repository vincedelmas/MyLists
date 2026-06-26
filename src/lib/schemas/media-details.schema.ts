import * as z from "zod";
import {JobType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, mediaTypeMediaIdSchema, paginationSchema} from "@/lib/schemas/common.schema";


export type UpdateBookCoverInput = z.input<typeof updateBookCoverSchema>;
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

export const updateBookCoverSchema = z.object({
    imageUrl: z.url().trim().optional(),
    mediaId: coercedPositiveIntFieldSchema,
    imageFile: z.instanceof(File).optional(),
}).superRefine((data, ctx) => {
    const addFieldIssues = (message: string) => {
        ctx.addIssue({ code: "custom", message, path: ["imageUrl"] });
        ctx.addIssue({ code: "custom", message, path: ["imageFile"] });
    };

    if (!data.imageUrl && !data.imageFile) {
        addFieldIssues("Provide an image link or upload a file.");
    }
    if (data.imageUrl && data.imageFile) {
        addFieldIssues("Please, choose only one cover option.");
    }
});


export const mediaDetailsJobSchema = z.object({
    name: z.string(),
    job: z.enum(JobType),
    mediaType: mediaTypeFieldSchema,
})


export const jobDetailsSchema = mediaDetailsJobSchema.extend({
    pagination: paginationSchema,
});
