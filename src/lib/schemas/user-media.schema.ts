import * as z from "zod";
import {isValidActivityDate} from "@/lib/utils/media/activity";
import {tvSeasonStateSchema} from "@/lib/schemas/tv-seasons.schema";
import {GamesPlatformsEnum, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {emptyStringToNull, importStatusSchema} from "@/lib/server/domain/imports/import-list-validation";
import {COMMENT_MAX_LENGTH, MIN_ACTIVITY_DATE, PLAYTIME_MAX_MINUTES, PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";
import {coercedPositiveIntFieldSchema, imageFileSchema, imageUrlSchema, mediaTypeFieldSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";


export type UpdateUserMedia = z.infer<typeof updateUserMediaSchema>;
export type UpdateUserCustomCover = z.infer<typeof updateUserCustomCoverSchema>;
export type UpdateUserCustomCoverInput = z.input<typeof updateUserCustomCoverSchema>;


const loggedAtSchema = z.string().trim().pipe(z.iso.date())
    .refine(isValidActivityDate, `Date must be between ${MIN_ACTIVITY_DATE} and today.`)
    .optional();

export const loggedActivityUpdateTypes = new Set<UpdateType>([
    UpdateType.TV,
    UpdateType.PAGE,
    UpdateType.REDO,
    UpdateType.STATUS,
    UpdateType.CHAPTER,
    UpdateType.PLAYTIME,
]);

const allowedPayloadFieldsByUpdateType = {
    [UpdateType.STATUS]: ["status"],
    [UpdateType.PAGE]: ["actualPage"],
    [UpdateType.COMMENT]: ["comment"],
    [UpdateType.PLAYTIME]: ["playtime"],
    [UpdateType.FAVORITE]: ["favorite"],
    [UpdateType.PLATFORM]: ["platform"],
    [UpdateType.CHAPTER]: ["currentChapter"],
    [UpdateType.REDO]: ["redo", "seasonRedos"],
    [UpdateType.RATING]: ["rating", "seasonRating"],
    [UpdateType.TV]: ["currentSeason", "currentEpisode"],
} satisfies Record<UpdateType, string[]>;


const validateStatusForMediaType = (mediaType: MediaType, status: Status, ctx: z.RefinementCtx, path: (string | number)[]) => {
    const result = importStatusSchema(mediaType).safeParse(status);
    if (!result.success) {
        ctx.addIssue({
            path,
            code: "custom",
            message: result.error.issues[0]?.message ?? "Status is not valid for this media type.",
        });
    }
};


export const updateUserCustomCoverSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    imageUrl: imageUrlSchema.optional(),
    imageFile: imageFileSchema.optional(),
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
}).superRefine((data, ctx) => {
    if (!data.status) return;
    validateStatusForMediaType(data.mediaType, data.status, ctx, ["status"]);
});

export const updateUserMediaSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    mediaId: coercedPositiveIntFieldSchema,
    payload: z.object({
        type: z.enum(UpdateType),
        loggedAt: loggedAtSchema,
        favorite: z.boolean().optional(),
        status: z.enum(Status).optional(),
        platform: z.enum(GamesPlatformsEnum).optional().nullable(),
        redo: z.number().int().min(0).max(REDO_MAX).optional(),
        rating: z.number().min(0).max(10).optional().nullable(),
        seasonRating: tvSeasonStateSchema.pick({ season: true, rating: true }).optional(),
        actualPage: z.number().int().min(0).max(PROGRESS_MAX, `Progress cannot exceed ${PROGRESS_MAX}!`).optional(),
        currentSeason: z.number().int().min(1).max(PROGRESS_MAX, `Progress cannot exceed ${PROGRESS_MAX}!`).optional(),
        currentChapter: z.number().int().min(0).max(PROGRESS_MAX, `Progress cannot exceed ${PROGRESS_MAX}!`).optional(),
        currentEpisode: z.number().int().min(0).max(PROGRESS_MAX, `Progress cannot exceed ${PROGRESS_MAX}!`).optional(),
        playtime: z.number().min(0).max(PLAYTIME_MAX_MINUTES, `Playtime cannot exceed ${PLAYTIME_MAX_MINUTES}!`).optional(),
        comment: z.preprocess(emptyStringToNull, z.string().max(COMMENT_MAX_LENGTH, `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`).nullish()),
        seasonRedos: z.array(tvSeasonStateSchema.pick({ season: true, redo: true })).min(1).max(PROGRESS_MAX)
            .refine(rows => new Set(rows.map(s => s.season)).size === rows.length, "Duplicate season numbers.").optional(),
    }).superRefine((data, ctx) => {
        const definedFields = Object.entries(data)
            .filter(([key, value]) => key !== "type" && key !== "loggedAt" && value !== undefined)
            .map(([key, _]) => key);

        if (definedFields.length !== 1) {
            ctx.addIssue({
                code: "custom",
                path: ["type"],
                message: "Expected exactly one update field in the payload.",
            });
            return;
        }

        const [definedField] = definedFields;
        if (!allowedPayloadFieldsByUpdateType[data.type].includes(definedField)) {
            ctx.addIssue({
                code: "custom",
                path: [definedField],
                message: `Field "${definedField}" is not valid for update type "${data.type}".`,
            });
        }
    }).refine((data) => !data.loggedAt || loggedActivityUpdateTypes.has(data.type), {
        message: "Only progress changes can be backdated.", path: ["loggedAt"],
    })
}).superRefine((data, ctx) => {
    const isTv = data.mediaType === MediaType.SERIES || data.mediaType === MediaType.ANIME;

    if ((data.payload.seasonRating || data.payload.seasonRedos) && !isTv) {
        ctx.addIssue({ code: "custom", path: ["payload"], message: "Season updates are only available for TV." });
    }

    if (data.payload.type === UpdateType.REDO && isTv && !data.payload.seasonRedos) {
        ctx.addIssue({ code: "custom", path: ["payload", "seasonRedos"], message: "TV rewatches require season numbers." });
    }

    if (!data.payload.status) return;
    validateStatusForMediaType(data.mediaType, data.payload.status, ctx, ["payload", "status"]);
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
