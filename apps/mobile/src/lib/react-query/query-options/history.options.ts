import {api} from "../../api-client";
import {infiniteQueryOptions} from "@tanstack/react-query";

export const historyOptions = (userId?: number) =>
    infiniteQueryOptions({
        queryKey: ["profile", userId, "history"],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.history(pageParam, signal, userId),
        getNextPageParam: (page) => (page.page < page.pages ? page.page + 1 : undefined),
    });
