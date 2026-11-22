import {db} from "@/lib/server/database/db";
import {closeRedisConnection} from "@/lib/server/core/redis-client";
import {createServerEntry, createStartHandler, defaultStreamHandler} from "@tanstack/react-start/server";


export default {
    ...createServerEntry({ fetch: createStartHandler(defaultStreamHandler) }),
    // Keep cleanup in app bundle so it closes instances used by requests
    async closeResources() {
        try {
            await closeRedisConnection();
        }
        finally {
            db.$client.close();
        }
    },
};
