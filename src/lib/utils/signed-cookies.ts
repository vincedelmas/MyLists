import {setCookie} from "@tanstack/react-start/server";


const algorithm = { name: "HMAC", hash: "SHA-256" };


export const signCookieValue = async (value: string, secret: string) => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        algorithm,
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign(
        algorithm,
        key,
        new TextEncoder().encode(value)
    );
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
};


export const setSignedCookie = async (name: string, value: string, secret: string, maxAge?: number) => {
    const sig = await signCookieValue(value, secret);

    setCookie(name, `${encodeURIComponent(value)}.${sig}`, {
        maxAge,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });
};
