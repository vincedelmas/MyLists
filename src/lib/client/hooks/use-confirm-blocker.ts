import {useRef} from "react";
import {useBlocker} from "@tanstack/react-router";
import {ConfirmOptions, requestConfirm} from "@/lib/client/hooks/use-confirm";


interface UseConfirmBlockerOptions extends ConfirmOptions {
    when: boolean;
    disabled?: boolean;
    enableBeforeUnload?: boolean;
}


export const useConfirmBlocker = ({ when, disabled = false, enableBeforeUnload = true, ...confirmOptions }: UseConfirmBlockerOptions) => {
    const pendingRef = useRef<Promise<boolean> | null>(null);
    const currentRef = useRef({ when, disabled, enableBeforeUnload, confirmOptions });

    currentRef.current = { when, disabled, enableBeforeUnload, confirmOptions };

    useBlocker({
        disabled,
        withResolver: false,
        enableBeforeUnload: () => {
            const current = currentRef.current;
            return current.enableBeforeUnload && current.when && !current.disabled;
        },
        shouldBlockFn: async () => {
            const current = currentRef.current;
            if (current.disabled || !current.when) return false;

            if (!pendingRef.current) {
                pendingRef.current = requestConfirm(current.confirmOptions)
                    .catch((error: unknown) => {
                        console.error("Unable to request navigation confirmation:", error);
                        return false;
                    })
                    .finally(() => pendingRef.current = null);
            }

            const confirmed = await pendingRef.current;
            return !confirmed;
        },
    });
}
