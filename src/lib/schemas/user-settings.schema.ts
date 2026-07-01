import * as z from "zod";
import {usernameSchema} from "@/lib/schemas/auth.schema";
import {mediaTypeFieldSchema, mediaTypeMediaIdSchema} from "@/lib/schemas/common.schema";
import {ApiProviderType, MediaType, PrivacyType, RatingSystemType} from "@/lib/utils/enums";
import {
    createDefaultHighlightedMediaSettings,
    HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    HIGHLIGHTED_MEDIA_TABS,
    HighlightedMediaRef,
    HighlightedMediaSettings,
    HighlightedMediaTabConfig,
    PROFILE_MAX_HIGHLIGHTED_MEDIA
} from "@/lib/types/profile-custom.types";


export type ListSettings = z.infer<typeof mediaListSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type PasswordSettingsForm = z.infer<typeof passwordSettingsFormSchema>;


const highlightedMediaRefSchema: z.ZodType<HighlightedMediaRef> = mediaTypeMediaIdSchema;

const highlightedMediaTabConfigSchema: z.ZodType<HighlightedMediaTabConfig> = z.object({
    mode: z.enum(["random", "curated", "disabled"]),
    items: z.array(highlightedMediaRefSchema).max(PROFILE_MAX_HIGHLIGHTED_MEDIA).default([]),
    title: z.string().trim().max(50)
        .transform((value) => value || HIGHLIGHTED_MEDIA_DEFAULT_TITLE)
        .default(HIGHLIGHTED_MEDIA_DEFAULT_TITLE),
});

const highlightedMediaSettingsShape = HIGHLIGHTED_MEDIA_TABS.reduce((acc, tab) => {
    acc[tab] = highlightedMediaTabConfigSchema.default({
        items: [],
        mode: "random",
        title: HIGHLIGHTED_MEDIA_DEFAULT_TITLE,
    });
    return acc;
}, {} as Record<(typeof HIGHLIGHTED_MEDIA_TABS)[number], z.ZodDefault<typeof highlightedMediaTabConfigSchema>>);


export const highlightedMediaSettingsSchema = z.object(highlightedMediaSettingsShape)
    .default(createDefaultHighlightedMediaSettings())
    .superRefine((settings, ctx) => {
        for (const tab of HIGHLIGHTED_MEDIA_TABS) {
            const tabConfig = settings[tab];

            if (tabConfig.mode === "curated" && tabConfig.items.length === 0) {
                ctx.addIssue({
                    code: "custom",
                    path: [tab, "items"],
                    message: "Add at least 1 item or switch this tab back to Random or Disabled.",
                });
            }

            if (tab !== "overview") {
                tabConfig.items.forEach((item: { mediaType: MediaType }, index: number) => {
                    if (item.mediaType !== tab) {
                        ctx.addIssue({
                            code: "custom",
                            path: [tab, "items", index, "mediaType"],
                            message: "Items must match the media type of this tab.",
                        });
                    }
                });
            }
        }
    }) as z.ZodType<HighlightedMediaSettings, HighlightedMediaSettings>;

export const generalSettingsSchema = z.object({
    privacy: z.enum(PrivacyType),
    profileImage: z.instanceof(File).optional()
        .refine((file) => !file || file.size <= 10 * 1024 * 1000, "Image must be less than 10MB."),
    backgroundImage: z.instanceof(File).optional()
        .refine((file) => !file || file.size <= 10 * 1024 * 1000, "Image must be less than 10MB."),
    username: usernameSchema,
});

export const mediaListSettingsSchema = z.object({
    anime: z.boolean(),
    games: z.boolean(),
    manga: z.boolean(),
    books: z.boolean(),
    gridListView: z.boolean(),
    ratingSystem: z.enum(RatingSystemType),
    searchSelector: z.enum(ApiProviderType),
});

export const highlightedMediaSearchSchema = z.object({
    tab: z.enum(HIGHLIGHTED_MEDIA_TABS),
    query: z.string().trim().min(2).max(100),
});

export const passwordSettingsSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string()
        .min(8, "The Password is too short (8 min.)")
        .max(50, "The Password is too long (50 max)."),
});

export const passwordSettingsFormSchema = passwordSettingsSchema.extend({
    confirmNewPassword: z.string().min(1, "Please confirm your password."),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
});

export const emailSettingsSchema = z.object({
    email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
});

export const downloadListAsCsvSchema = z.object({
    selectedList: mediaTypeFieldSchema,
});
