import {queryOptions} from "@tanstack/react-query";
import {getContinueMedia} from "@/lib/server/functions/continue";
import type {ContinueSearch} from "@/lib/schemas/continue.schema";


export const continueOptions = (username: string, search: ContinueSearch & { preview?: boolean } = {}) => queryOptions({
    queryKey: ["continue", username, search] as const,
    queryFn: () => getContinueMedia({ data: { username, ...search } }),
});


export type ContinueItem = Awaited<ReturnType<typeof getContinueMedia>>["items"][number];
