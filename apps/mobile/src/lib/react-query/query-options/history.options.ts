import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";


export const historyOptions = (page: number, search: string, userId?: number) => queryOptions({
    queryKey: [
        "profile",
        userId,
        "history",
        { page, search }
    ],
    queryFn: ({ signal }) => api.history(page, signal, userId, search || undefined),
});
