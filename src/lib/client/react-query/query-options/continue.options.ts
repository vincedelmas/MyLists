import {queryOptions} from "@tanstack/react-query";
import {getContinueMedia} from "@/lib/server/functions/continue";


export const continueOptions = (username: string) => queryOptions({
    queryKey: ["continue", username] as const,
    queryFn: () => getContinueMedia({ data: { username } }),
});

export type ContinueItem = Awaited<ReturnType<typeof getContinueMedia>>["items"][number];
