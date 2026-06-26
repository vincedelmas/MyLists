import {setCookie} from "@tanstack/react-start/server";


const algorithm = { name: "HMAC", hash: "SHA-256" };


export const signCookieValue = async (value: string, secret: string) => {
    const bufferValue = new TextEncoder().encode(value);
    const bufferSecret = new TextEncoder().encode(secret);

    const key = await crypto.subtle.importKey("raw", bufferSecret, algorithm, false, ["sign"]);
    const sig = await crypto.subtle.sign(algorithm, key, bufferValue);

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
