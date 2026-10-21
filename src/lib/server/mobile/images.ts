import {clientEnv} from "@/env/client";

// Stored covers belong to this instance. External search-provider images retain
// their own origins and never pass through this conversion.
export const mobileImagePath = (url: string) => new URL(url, clientEnv.VITE_BASE_URL).pathname;
