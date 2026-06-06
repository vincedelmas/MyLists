import {queryOptions} from "@tanstack/react-query";
import {getCurrentUser} from "@/lib/server/functions/auth";


export const authOptions = queryOptions({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    staleTime: 10 * 60 * 1000,
});
