import * as z from "zod";
import {isValidActivityDate} from "@/lib/utils/activity-utils";
import {GamesPlatformsEnum, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, mediaTypeFieldSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";
import {COMMENT_MAX_LENGTH, MIN_ACTIVITY_DATE, PLAYTIME_MAX_MINUTES, PROGRESS_MAX, REDO_MAX} from "@/lib/utils/constants";
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

const allowedStatuses: Record<MediaType, readonly Status[]> = {
    [MediaType.SERIES]: [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLAN_TO_WATCH],
    [MediaType.ANIME]: [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLAN_TO_WATCH],
    [MediaType.MOVIES]: [Status.COMPLETED, Status.PLAN_TO_WATCH],
    [MediaType.GAMES]: [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY],
    [MediaType.BOOKS]: [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ],
    [MediaType.MANGA]: [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ],
};

const validateStatusForMediaType = (mediaType: MediaType, status: Status, ctx: z.RefinementCtx, path: (string | number)[]) => {
    if (!allowedStatuses[mediaType].includes(status)) {
        ctx.addIssue({
            path,
            code: "custom",
            message: `Status is not valid for ${mediaType}. Allowed statuses: ${allowedStatuses[mediaType].join(", ")}`,
        });
    }
};


export const updateUserCustomCoverSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    imageUrl: z.url().trim().optional(),
    mediaId: coercedPositiveIntFieldSchema,
    imageFile: z.instanceof(File).optional(),
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

const ratingPayload = z.object({ type: z.literal(UpdateType.RATING), rating: z.number().min(0).max(10).nullable() }).strict();
const commentPayload = z.object({
    type: z.literal(UpdateType.COMMENT),
    comment: z.string().max(COMMENT_MAX_LENGTH, `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`).nullable(),
}).strict();
const favoritePayload = z.object({ type: z.literal(UpdateType.FAVORITE), favorite: z.boolean() }).strict();
const statusPayload = z.object({ type: z.literal(UpdateType.STATUS), status: z.enum(Status), loggedAt: loggedAtSchema }).strict();
const movieRewatchPayload = z.object({
    type: z.literal(UpdateType.REDO),
    rewatchCount: z.number().int().min(0).max(REDO_MAX),
    loggedAt: loggedAtSchema,
}).strict();
const rereadPayload = z.object({
    type: z.literal(UpdateType.REDO),
    rereadCount: z.number().int().min(0).max(REDO_MAX),
    loggedAt: loggedAtSchema,
}).strict();
const commonPayloads = [ratingPayload, commentPayload, favoritePayload, statusPayload] as const;

const tvPayload = z.discriminatedUnion("type", [
    ...commonPayloads,
    z.object({
        type: z.literal(UpdateType.TV),
        currentSeason: z.number().int().min(1).max(PROGRESS_MAX).optional(),
        currentEpisode: z.number().int().min(0).max(PROGRESS_MAX).optional(),
        loggedAt: loggedAtSchema,
    }).strict().refine((payload) => payload.currentSeason !== undefined || payload.currentEpisode !== undefined, {
        message: "Provide a season or episode.",
    }),
    z.object({
        type: z.literal(UpdateType.REDO),
        rewatches: z.array(z.object({
            seasonNumber: z.number().int().positive(),
            count: z.number().int().min(0).max(REDO_MAX),
        }).strict()),
        loggedAt: loggedAtSchema,
    }).strict(),
]);
const moviePayload = z.discriminatedUnion("type", [...commonPayloads, movieRewatchPayload]);
const gamePayload = z.discriminatedUnion("type", [
    ...commonPayloads,
    z.object({ type: z.literal(UpdateType.PLAYTIME), playtime: z.number().min(0).max(PLAYTIME_MAX_MINUTES), loggedAt: loggedAtSchema }).strict(),
    z.object({ type: z.literal(UpdateType.PLATFORM), platform: z.enum(GamesPlatformsEnum).nullable() }).strict(),
]);
const bookPayload = z.discriminatedUnion("type", [
    ...commonPayloads,
    rereadPayload,
    z.object({ type: z.literal(UpdateType.PAGE), currentPage: z.number().int().min(0).max(PROGRESS_MAX), loggedAt: loggedAtSchema }).strict(),
]);
const mangaPayload = z.discriminatedUnion("type", [
    ...commonPayloads,
    rereadPayload,
    z.object({ type: z.literal(UpdateType.CHAPTER), currentChapter: z.number().int().min(0).max(PROGRESS_MAX), loggedAt: loggedAtSchema }).strict(),
]);

export const updateUserMediaSchema = z.discriminatedUnion("mediaType", [
    z.object({ mediaType: z.literal(MediaType.SERIES), mediaId: coercedPositiveIntFieldSchema, payload: tvPayload }).strict(),
    z.object({ mediaType: z.literal(MediaType.ANIME), mediaId: coercedPositiveIntFieldSchema, payload: tvPayload }).strict(),
    z.object({ mediaType: z.literal(MediaType.MOVIES), mediaId: coercedPositiveIntFieldSchema, payload: moviePayload }).strict(),
    z.object({ mediaType: z.literal(MediaType.GAMES), mediaId: coercedPositiveIntFieldSchema, payload: gamePayload }).strict(),
    z.object({ mediaType: z.literal(MediaType.BOOKS), mediaId: coercedPositiveIntFieldSchema, payload: bookPayload }).strict(),
    z.object({ mediaType: z.literal(MediaType.MANGA), mediaId: coercedPositiveIntFieldSchema, payload: mangaPayload }).strict(),
]).superRefine((data, ctx) => {
    if (!("status" in data.payload)) return;
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
        name: z.string().trim().min(1, "Tag name cannot be empty."),
        oldName: z.string().trim().min(1, "Tag name cannot be empty.").optional(),
    }),
});
