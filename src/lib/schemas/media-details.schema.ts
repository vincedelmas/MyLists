import * as z from "zod";
import {JobType, MediaType} from "@/lib/utils/enums";
import {paginationSchema} from "@/lib/schemas/common.schema";


export const mediaDetailsSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const mediaCommunityActivitySchema = mediaDetailsSchema.extend({
    search: paginationSchema,
});

export const externalMediaResolveSchema = z.object({
    apiId: z.coerce.string(),
    mediaType: z.enum(MediaType),
});

export const refreshMediaDetailsSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const mediaDetailsToEditSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const editMediaDetailsSchema = z.object({
    mediaType: z.enum(MediaType),
    payload: z.record(z.any(), z.any()),
    mediaId: z.coerce.number().int().positive(),
});

export const updateBookCoverSchema = z.object({
    imageUrl: z.url().trim().optional(),
    imageFile: z.instanceof(File).optional(),
    mediaId: z.coerce.number().int().positive(),
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
    mediaType: z.enum(MediaType),
})


export const jobDetailsSchema = mediaDetailsJobSchema.extend({
    pagination: paginationSchema,
});
