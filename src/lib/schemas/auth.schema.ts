import * as z from "zod";
import {usernameSchema} from "@/lib/schemas/common.schema";
import {getSafeRedirectPath} from "@/lib/utils/auth-utils";


export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;


export const tokenSchema = z.object({
    token: z.string().min(1),
});


export const authRedirectSearchSchema = z.object({
    message: z.string().optional().catch(undefined),
    step: z.enum(["verify"]).optional().catch(undefined),
    usernameNotice: z.literal("check").optional().catch(undefined),
    error: z.string().trim().min(1).max(100).optional().catch(undefined),
    authExpired: z.preprocess((val) => (val === true || val === "true") ? true : undefined, z.literal(true).optional()),
    redirect: z.preprocess((val?: unknown) => getSafeRedirectPath(val, "http://mylists.local"), z.string().optional()),
});

export const resetPasswordSchema = z.object({
    newPassword: z.string()
        .min(1, "The password is required.")
        .min(8, "The password is too short (8 min).")
        .max(128, "The password is too long (128 max)."),
    confirmPassword: z.string().min(1, "The password confirmation is required."),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
});


export const loginSchema = z.object({
    email: z.email().min(1, "Email is required."),
    password: z.string().min(1, "Password is required."),
});


export const forgotPasswordSchema = z.object({
    email: z.email().min(1, "Email is required."),
});


export const registerSchema = z.object({
    username: usernameSchema,
    email: z.email().min(1, "Email is required."),
    password: z.string()
        .min(1, "Password is required.")
        .min(8, "The password is too short (8 min).")
        .max(128, "The password is too long (128 max)."),
    confirmPassword: z.string().min(1, "The password confirmation is required."),
}).refine((data) => data.password === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
});
