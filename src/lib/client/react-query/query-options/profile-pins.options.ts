import {queryOptions} from "@tanstack/react-query";
import {getOwnProfilePins, getProfilePins} from "@/lib/server/functions/profile-pins";


export type ProfilePinsData = Awaited<ReturnType<typeof getProfilePins>>;


export const ownProfilePinsOptions = queryOptions({
    queryKey: ["profile-pins", "own"],
    queryFn: () => getOwnProfilePins(),
});


export const profilePinsOptions = (username: string) => queryOptions({
    queryKey: ["profile-pins", "profile", username],
    queryFn: () => getProfilePins({ data: { username } }),
});
