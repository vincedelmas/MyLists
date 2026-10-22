import {api} from "../../api-client";
import {infiniteQueryOptions} from "@tanstack/react-query";


export const socialOptions = (kind: Parameters<typeof api.social>[0]["kind"]) => infiniteQueryOptions({
    queryKey: ["social", kind],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => api.social({ kind, page: pageParam }, signal),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
});
