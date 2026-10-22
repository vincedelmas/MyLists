import {api} from "../../api-client";
import {infiniteQueryOptions} from "@tanstack/react-query";


export const historyOptions = infiniteQueryOptions({
    queryKey: ["profile", "history"],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => api.history(pageParam, signal),
    getNextPageParam: (page) => (page.page < page.pages ? page.page + 1 : undefined),
});
