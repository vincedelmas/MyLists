import type {ComponentProps} from "react";
import type {UpdatePayload} from "@/lib/types/user-media.types";
import {AutoSaveFeedback} from "@/lib/client/components/general/AutoSaveFeedback";
import type {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type PayloadKey<T> = T extends unknown ? keyof T : never;
type MediaUpdateField = Exclude<PayloadKey<UpdatePayload["payload"]>, "type" | "loggedAt">;


type MediaSaveFeedbackProps = Omit<ComponentProps<typeof AutoSaveFeedback>, "mutation" | "acknowledged"> & {
    field: MediaUpdateField | MediaUpdateField[];
    mutation: ReturnType<typeof useUpdateUserMediaMutation>;
};


export function MediaSaveFeedback({ mutation, field, active = true, ...props }: MediaSaveFeedbackProps) {
    const payload = mutation.variables?.payload;

    return (
        <AutoSaveFeedback
            {...props}
            mutation={mutation}
            acknowledged={mutation.data != null}
            active={active && payload !== undefined && (Array.isArray(field) ? field : [field]).some(key => key in payload)}
        />
    );
}
