import * as z from "zod";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {coverImageFieldsSchema} from "@/lib/schemas/cover.schema";
import {GamesPlatformsEnum, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";


export type UpdateUserMedia = z.infer<typeof updateUserMediaSchema>;
export type UpdateUserCustomCover = z.infer<typeof updateUserCustomCoverSchema>;


const loggedAtSchema = z.string().trim().pipe(z.iso.date())
    .refine((value) => dateFromUTCInput(value).getTime() <= Date.now(), "Date cannot be in the future.")
    .optional();

const loggedActivityUpdateTypes = new Set<UpdateType>([
    UpdateType.TV,
    UpdateType.PAGE,
    UpdateType.REDO,
    UpdateType.STATUS,
    UpdateType.CHAPTER,
    UpdateType.PLAYTIME,
]);


export const updateUserCustomCoverSchema = coverImageFieldsSchema.extend({
    mediaType: mediaTypeFieldSchema,
    mediaId: coercedPositiveIntFieldSchema,
    remove: z.coerce.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    const addFieldIssues = (message: string) => {
        ctx.addIssue({ code: "custom", message, path: ["imageUrl"] });
        ctx.addIssue({ code: "custom", message, path: ["imageFile"] });
    };

    if (data.remove && (data.imageUrl || data.imageFile)) {
        addFieldIssues("Provide an image link, upload a file, or choose remove.");
    }
    if (!data.remove && !data.imageUrl && !data.imageFile) {
        addFieldIssues("Provide an image link, upload a file, or choose remove.");
    }
    if (!data.remove && data.imageUrl && data.imageFile) {
        addFieldIssues("Please, choose only one cover option.");
    }
});

export const addMediaToListSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    status: z.enum(Status).optional(),
    mediaId: coercedPositiveIntFieldSchema,
});

export const updateUserMediaSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    mediaId: coercedPositiveIntFieldSchema,
    payload: z.object({
        type: z.enum(UpdateType),
        loggedAt: loggedAtSchema,
        favorite: z.boolean().optional(),
        status: z.enum(Status).optional(),
        comment: z.string().nullish().optional(),
        redo: z.number().int().min(0).optional(),
        actualPage: z.number().int().min(0).optional(),
        currentSeason: z.number().int().min(1).optional(),
        currentChapter: z.number().int().min(0).optional(),
        redo2: z.array(z.number().int().min(0)).optional(),
        currentEpisode: z.number().int().min(0).optional(),
        platform: z.enum(GamesPlatformsEnum).optional().nullable(),
        playtime: z.number().min(0).max(15000 * 60).optional(),
        rating: z.number().min(0).max(10).optional().nullable(),
    }).refine((data) => {
        const definedFields = Object.entries(data)
            .filter(([key, value]) => key !== "type" && key !== "loggedAt" && value !== undefined)
            .map(([key, _]) => key);
        return definedFields.length === 1;
    }, {
        message: "Too many fields provided in the payload.", path: ["type"],
    }).refine((data) => !data.loggedAt || loggedActivityUpdateTypes.has(data.type), {
        message: "Only progress changes can be backdated.", path: ["loggedAt"],
    })
});

export const deleteUserUpdatesSchema = z.object({
    updateIds: z.array(positiveIntFieldSchema),
    returnData: z.coerce.boolean().default(false),
});

export const userTagNamesSchema = z.object({
    mediaType: mediaTypeFieldSchema,
});

export const editUserTagSchema = z.object({
    action: z.enum(TagAction),
    mediaType: mediaTypeFieldSchema,
    mediaId: coercedPositiveIntFieldSchema.optional(),
    tag: z.object({
        name: z.string(),
        oldName: z.string().optional(),
    }),
});
