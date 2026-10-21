import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";

export const profileOptions = queryOptions({
    queryKey: ["profile"],
    queryFn: ({signal}) => api.profile(signal),
});

export const profileActivityOptions = queryOptions({
    queryKey: ["profile", "activity"],
    queryFn: ({signal}) => api.profileActivity(signal),
});

export const statsOptions = queryOptions({queryKey: ["profile", "stats"], queryFn: ({signal}) => api.stats(signal)});
export const achievementsOptions = queryOptions({
    queryKey: ["profile", "achievements"],
    queryFn: ({signal}) => api.achievements(signal),
});
