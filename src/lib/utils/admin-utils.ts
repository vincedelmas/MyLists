import crypto from "node:crypto";
import {serverEnv} from "@/env/server";
import {signCookieValue} from "@/lib/utils/signed-cookies";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {deleteCookie, getCookie, setCookie} from "@tanstack/react-start/server";


const ADMIN_COOKIE_NAME = "myListsAdminToken";


const verifyAdminToken = async (token: string, currentUserId: number) => {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;

    const payload = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expected = await signCookieValue(payload, serverEnv.ADMIN_TOKEN_SECRET);

    if (sig !== expected) return false;

    const [userId, exp] = payload.split(":");
    if (!userId || !exp) return false;

    // Check userId matches current user
    if (userId !== String(currentUserId)) return false;

    // Check not expired
    return Date.now() < parseInt(exp, 10);
};


export const adminAuthRateLimiter = createRateLimiter({ points: 5, duration: 15 * 60, keyPrefix: "admin-auth" });


export const verifyAdminPassword = async (password: string) => {
    const submittedPassword = crypto.createHash("sha256").update(password).digest();
    const configPassword = crypto.createHash("sha256").update(serverEnv.ADMIN_PASSWORD).digest();

    return crypto.timingSafeEqual(submittedPassword, configPassword);
};


export const setAdminCookie = async (userId: number) => {
    const exp = Date.now() + serverEnv.ADMIN_TTL_COOKIE_MIN * 60 * 1000;
    const payload = `${userId}:${exp}`;
    const sig = await signCookieValue(payload, serverEnv.ADMIN_TOKEN_SECRET);

    setCookie(ADMIN_COOKIE_NAME, `${payload}.${sig}`, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: serverEnv.ADMIN_TTL_COOKIE_MIN * 60,
        secure: process.env.NODE_ENV === "production",
    });
};


export const clearAdminCookie = () => {
    deleteCookie(ADMIN_COOKIE_NAME, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
    });
};


export const isAdminAuthenticated = async (currentUserId: number) => {
    const token = getCookie(ADMIN_COOKIE_NAME);
    return token ? await verifyAdminToken(token, currentUserId) : false;
};
