import * as z from "zod";


export const tokenSchema = z.object({
    token: z.string().min(1),
});


export const authRedirectSearchSchema = z.object({
    redirect: z.preprocess((val?: unknown) => {
        if (typeof val !== "string" || !val.trim()) return undefined;

        try {
            const url = new URL(val, "http://mylists.local");
            if (url.origin !== "http://mylists.local") return undefined;

            const path = `${url.pathname}${url.search}${url.hash}`;
            if (!path.startsWith("/") || path.startsWith("//")) return undefined;

            return path;
        }
        catch {
            return undefined;
        }
    }, z.string().optional()),
    message: z.string().optional().catch(undefined),
    authExpired: z.preprocess((val) => (val === true || val === "true") ? true : undefined, z.literal(true).optional())
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


export const usernameSchema = z.string().trim()
    .min(1, "Username is required.")
    .min(3, "The username is too short (3 min).")
    .max(15, "The username is too long (15 max).");


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
