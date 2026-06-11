import * as z from "zod";
import {createEnv} from "@t3-oss/env-core";


export const clientEnv = createEnv({
    clientPrefix: "VITE_",
    client: {
        VITE_BASE_URL: z.url().default("http://localhost:3000"),
        VITE_CONTACT_MAIL: z.string().default(""),

        VITE_PUBLIC_POSTHOG_KEY: z.string().default(""),
        VITE_PUBLIC_POSTHOG_HOST: z.string().default(""),
        VITE_PUBLIC_POSTHOG_UI_HOST: z.string().default(""),
    },
    runtimeEnv: import.meta.env,
});
