import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "../../api-client";


export function useActivityMutation() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: api.saveMonthlyActivity,
        onSuccess: () => client.invalidateQueries({ queryKey: ["monthly-activity"] }),
    });
}
