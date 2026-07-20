import {queryOptions} from "@tanstack/react-query";
import {getAuthMethods, getCurrentUser} from "@/lib/server/functions/auth";


export const authOptions = queryOptions({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    staleTime: 10 * 60 * 1000,
});


export const authMethodsOptions = queryOptions({
    queryKey: ["authMethods"],
    queryFn: () => getAuthMethods(),
    staleTime: Infinity,
});
