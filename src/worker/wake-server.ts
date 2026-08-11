type WakeServerLogger = {
    error: (details: object, message: string) => void;
};


type StartWakeServerOptions = {
    hostname: string;
    logger: WakeServerLogger;
    onWake: () => void;
    port: number;
};


export const createWakeRequestHandler = (onWake: () => void) => (request: Request) => {
    const {pathname} = new URL(request.url);

    if (pathname === "/health" && request.method === "GET") {
        return new Response(null, {status: 204});
    }

    if (pathname === "/wake") {
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: {Allow: "POST"},
            });
        }

        onWake();
        return new Response(null, {status: 202});
    }

    return new Response("Not Found", {status: 404});
};


export const startWakeServer = ({hostname, logger, onWake, port}: StartWakeServerOptions) => Bun.serve({
    hostname,
    port,
    fetch: createWakeRequestHandler(onWake),
    error(error) {
        logger.error({err: error}, "Import worker wake server error");
        return new Response("Internal Server Error", {status: 500});
    },
});
