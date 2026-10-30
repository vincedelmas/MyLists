import type {ReactNode} from "react";
import {useMutationFeedback} from "@/lib/client/hooks/use-mutation-feedback";
import {SaveFeedbackIndicator} from "@/lib/client/components/general/SaveFeedbackIndicator";


interface AutoSaveFeedbackProps {
    active?: boolean;
    disabled?: boolean;
    acknowledged: boolean;
    children: (disabled: boolean) => ReactNode;
    mutation: Parameters<typeof useMutationFeedback>[0];
}


export function AutoSaveFeedback({ mutation, acknowledged, active = true, disabled = false, children }: AutoSaveFeedbackProps) {
    const feedback = useMutationFeedback(mutation, acknowledged && active);

    return (
        <div
            className="relative inline-flex shrink-0"
            aria-busy={mutation.isPending || feedback.loading}
            data-save-feedback={!disabled && feedback.pending && !feedback.loading ? "waiting" : undefined}
        >
            {children(disabled || feedback.pending)}

            <SaveFeedbackIndicator
                loading={active && feedback.loading}
                success={feedback.success}
                pending={feedback.pending || !active}
                className="absolute right-full top-1/2 mr-2 -translate-y-1/2"
            />
        </div>
    );
}
