import {useEffect, useRef, useState} from "react";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";


interface MutationFeedbackState {
    isPending: boolean;
    isSuccess: boolean;
    submittedAt: number;
}


// Presentation timing never delays mutation or its callbacks
export function useMutationFeedback(mutation: MutationFeedbackState, acknowledged: boolean) {
    const loading = useDelayedLoading(mutation.isPending);
    const [expiredSubmission, setExpiredSubmission] = useState(0);
    const initialSubmission = useRef(mutation.isPending ? 0 : mutation.submittedAt);

    const success = acknowledged && mutation.isSuccess && !loading
        && mutation.submittedAt !== initialSubmission.current
        && mutation.submittedAt !== expiredSubmission;

    useEffect(() => {
        if (!success) return;
        const timeout = window.setTimeout(() => setExpiredSubmission(mutation.submittedAt), 1500);
        return () => window.clearTimeout(timeout);
    }, [success, mutation.submittedAt]);

    return { loading, success, pending: mutation.isPending || loading };
}
