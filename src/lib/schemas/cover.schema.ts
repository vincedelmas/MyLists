import * as z from "zod";


export type CoverImageFormInput = z.input<typeof requiredCoverImageSchema>;


const addCoverFieldIssues = (ctx: z.RefinementCtx, message: string) => {
    ctx.addIssue({ code: "custom", message, path: ["imageUrl"] });
    ctx.addIssue({ code: "custom", message, path: ["imageFile"] });
};


export const coverImageFieldsSchema = z.object({
    imageUrl: z.url().trim().optional(),
    imageFile: z.instanceof(File).optional(),
});

export const requiredCoverImageSchema = coverImageFieldsSchema.superRefine((data, ctx) => {
    if (!data.imageUrl && !data.imageFile) {
        addCoverFieldIssues(ctx, "Provide an image link or upload a file.");
    }
    if (data.imageUrl && data.imageFile) {
        addCoverFieldIssues(ctx, "Please, choose only one cover option.");
    }
});
