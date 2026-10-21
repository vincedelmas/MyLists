import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";


export const profileOptions = queryOptions({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.profile(signal),
});


export const profileActivityOptions = queryOptions({
    queryKey: ["profile", "activity"],
    queryFn: ({ signal }) => api.profileActivity(signal),
});
