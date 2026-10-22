import { api } from "../../api-client";
import { infiniteQueryOptions } from "@tanstack/react-query";

export const socialOptions = (kind: Parameters<typeof api.social>[0]["kind"], userId?: number) =>
    infiniteQueryOptions({
        queryKey: ["social", kind, userId],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.social({ kind, page: pageParam }, signal, userId),
        getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    });
