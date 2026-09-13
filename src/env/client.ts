import * as z from "zod";
import {createEnv} from "@t3-oss/env-core";


export const clientEnv = createEnv({
    clientPrefix: "VITE_",
    runtimeEnv: import.meta.env,
    emptyStringAsUndefined: true,
    client: {
        VITE_CONTACT_MAIL: z.string().default(""),
        VITE_BASE_URL: z.url().default("http://localhost:3000"),

        VITE_PUBLIC_POSTHOG_HOST: z.url().optional(),
        VITE_PUBLIC_POSTHOG_KEY: z.string().trim().min(1).optional(),
    },
});
