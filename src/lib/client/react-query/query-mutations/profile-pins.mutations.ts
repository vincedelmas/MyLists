import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {ProfilePinItem} from "@/lib/schemas/profile-pins.schema";
import {postSetProfilePin} from "@/lib/server/functions/profile-pins";


export const useSetProfilePinMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["profile-pins"],
        mutationFn: (data: ProfilePinItem & { pinned: boolean }) => postSetProfilePin({ data }),
        meta: { successToastMessage: "Profile pins updated!" },
        onSuccess: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: ["profile-pins"] }),
            queryClient.invalidateQueries({ queryKey: ["dynamic-lists"] }),
            queryClient.invalidateQueries({ queryKey: ["collections"] }),
        ]),
    });
};
