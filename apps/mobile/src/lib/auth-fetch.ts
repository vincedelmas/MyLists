import {splitSetCookieHeader} from "better-auth/cookies/utils";


export const authFetch: typeof fetch = async (input, init) => {
    // Better Fetch skips its timeout when useSession supplies an AbortSignal.
    const timeoutController = new AbortController();
    const signal = init?.signal
        ? AbortSignal.any([init.signal, timeoutController.signal])
        : timeoutController.signal;
    const timer = setTimeout(() => timeoutController.abort(new Error("The authentication request timed out.")), 15_000);

    try {
        const response = await fetch(input, {...init, signal});
        const setCookie = response.headers.get("set-cookie");
        if (!setCookie) return response;

        const cookies = splitSetCookieHeader(setCookie);
        // Native sessions are verified against the server. A refreshed browser cache
        // cookie would notify Expo's session store and start another read indefinitely.
        const retained = cookies.filter(cookie => !/^(?:__Secure-|__Host-)?mylists\.session_data(?:\.\d+)?=/.test(cookie));
        if (retained.length === cookies.length) return response;

        const headers = new Headers(response.headers);
        headers.delete("set-cookie");
        headers.delete("content-length");
        headers.delete("content-encoding");
        for (const cookie of retained) headers.append("set-cookie", cookie);

        return new Response(await response.text(), {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }
    finally {
        clearTimeout(timer);
    }
};
