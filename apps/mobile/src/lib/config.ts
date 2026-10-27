const apiUrl = process.env.EXPO_PUBLIC_API_URL;


if (!apiUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL in apps/mobile/.env to the MyLists backend URL reachable from your phone.");
}


const parsedUrl = new URL(apiUrl);


if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    throw new Error("EXPO_PUBLIC_API_URL must be an HTTP(S) origin, without a path, query, or fragment.");
}


export const backendUrl = parsedUrl.origin;
